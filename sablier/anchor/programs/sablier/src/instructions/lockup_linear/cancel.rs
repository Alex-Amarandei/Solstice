use crate::{error::Error, validate_cancel, LockupLinearStream};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

/// Cancels a lockup linear stream, refunding the appropriate amount to the sender.
pub fn process_cancel_lockup_linear_stream(ctx: Context<CancelLockupLinearStream>) -> Result<()> {
    // Validate if cancellation is permitted
    validate_cancel(ctx.accounts.sender.key(), &ctx.accounts.stream.base_stream)?;

    let cliff_time = ctx.accounts.stream.cliff_time;
    let base_stream = &ctx.accounts.stream.base_stream;
    let start_time = base_stream.start_time;
    let end_time = base_stream.end_time;
    let deposited_amount = base_stream.amounts.deposited;
    let now = Clock::get()?.unix_timestamp;

    // Calculate the amount to refund
    let refundable_amount = if now < cliff_time.unwrap_or(start_time) {
        deposited_amount
    } else {
        let not_elapsed_percentage =
            (end_time as f64 - now as f64) / (end_time as f64 - start_time as f64);
        (deposited_amount as f64 * not_elapsed_percentage) as u64
    };

    // Transfer the refundable amount
    if refundable_amount > 0 {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.sender_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            authority: ctx.accounts.treasury_token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        transfer_checked(cpi_ctx, refundable_amount, ctx.accounts.token_mint.decimals)?;
    }

    // Mark stream as canceled
    let stream = &mut ctx.accounts.stream;
    let base_stream = &mut stream.base_stream;
    base_stream.is_canceled = true;
    base_stream.is_cancelable = false;
    base_stream.amounts.refunded = refundable_amount;

    Ok(())
}

/// Accounts for `cancel_lockup_linear_stream`.
#[derive(Accounts)]
pub struct CancelLockupLinearStream<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"LockupLinearStream",
            sender.key().as_ref(),
            &stream.base_stream.id
                .split('-')
                .nth(1)
                .and_then(|index| index.parse::<u64>().ok())
                .expect(Error::Validation::Stream::InvalidStreamIdFormat.to_string().as_str())
                .to_le_bytes()
        ],
        bump
    )]
    pub stream: Account<'info, LockupLinearStream>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
        associated_token::token_program = token_program,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}
