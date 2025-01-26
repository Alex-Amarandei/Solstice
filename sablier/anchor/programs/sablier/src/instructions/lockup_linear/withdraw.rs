use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    error::Error,
    extract_stream_counter_index,
    seeds::{LOCKUP_LINEAR_STREAM, LOCKUP_LINEAR_TREASURY},
    validate_withdraw, LockupLinearStream,
};

pub fn process_withdraw_from_lockup_linear_stream(
    ctx: Context<WithdrawFromLockupLinearStream>,
    amount: u64,
) -> Result<()> {
    msg!("Validating Withdraw Operation... 🛂");
    validate_withdraw(
        ctx.accounts.recipient.key(),
        amount,
        &ctx.accounts.stream.base_stream,
    )?;

    let stream = &mut ctx.accounts.stream;
    let now = Clock::get()?.unix_timestamp as i64;

    require!(
        stream.cliff_time <= now,
        Error::Validation::Stream::CliffNotEnded
    );

    let elapsed_amount = get_elapsed_amount(stream, now);
    let available_amount =
        elapsed_amount - stream.base_stream.amounts.withdrawn - stream.base_stream.amounts.refunded;
    msg!(
        "Elapsed Amount: {} | Available Amount: {} 🏧",
        elapsed_amount,
        available_amount
    );
    require!(
        available_amount >= amount,
        Error::Validation::Stream::ExceedsBalance
    );
    msg!("Validation successful ✅ Withdrawing from stream... ⏳");

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.treasury_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        authority: ctx.accounts.treasury_token_account.to_account_info(),
    };

    let mint_key = ctx.accounts.token_mint.key();
    let stream_counter_index = extract_stream_counter_index(&stream.base_stream.id);

    let signer_seeds: &[&[&[u8]]] = &[&[
        LOCKUP_LINEAR_TREASURY.as_ref(),
        mint_key.as_ref(),
        &stream_counter_index,
        &[ctx.bumps.treasury_token_account],
    ]];

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
        .with_signer(signer_seeds);
    transfer_checked(cpi_ctx, amount, ctx.accounts.token_mint.decimals)?;
    msg!("Transfer successful 💸");

    stream.base_stream.amounts.withdrawn += amount;

    Ok(())
}

fn get_elapsed_amount(stream: &LockupLinearStream, now: i64) -> u64 {
    let elapsed_time = now - stream.base_stream.start_time;
    let total_time = stream.base_stream.end_time - stream.base_stream.start_time;
    let total_amount = stream.base_stream.amounts.deposited;

    let elapsed_percentage = elapsed_time as f64 / total_time as f64;

    (elapsed_percentage * total_amount as f64) as u64
}

/// Accounts for `withdraw_from_lockup_linear_stream`
#[derive(Accounts)]
pub struct WithdrawFromLockupLinearStream<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(
        mut,
        seeds = [
            LOCKUP_LINEAR_STREAM.as_ref(),
            &extract_stream_counter_index(&stream.base_stream.id)
        ],
        constraint = stream.base_stream.recipient == recipient.key() @ Error::Authorization::Stream::UnauthorizedWithdraw,
        bump
    )]
    pub stream: Account<'info, LockupLinearStream>,

    #[account(
        mut,
        seeds = [
            LOCKUP_LINEAR_TREASURY.as_ref(),
            token_mint.key().as_ref(),
            &extract_stream_counter_index(&stream.base_stream.id),
        ],
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = recipient,
        associated_token::mint = token_mint,
        associated_token::authority = recipient,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}
