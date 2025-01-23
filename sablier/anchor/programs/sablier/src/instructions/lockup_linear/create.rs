use crate::{
    error::Error, validate_create, Amounts, BaseStream, LockupLinearStream, StreamCounter,
    ANCHOR_DISCRIMINATOR,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

/// Creates a new lockup linear stream, transferring funds to a treasury account.
pub fn process_create_lockup_linear_stream(
    ctx: Context<CreateLockupLinearStream>,
    name: String,
    recipient: Pubkey,
    amount: u64,
    start_time: i64,
    end_time: i64,
    cliff_time: i64,
    is_cancelable: bool,
    is_transferable: bool,
) -> Result<()> {
    validate_create(&ctx.accounts.stream_counter, start_time, end_time)?;

    let stream_counter = &mut ctx.accounts.stream_counter;
    let stream_id = format!("LL-{}", stream_counter.stream_index);

    // Validate cliff time
    require!(
        cliff_time >= start_time,
        Error::Validation::Stream::InvalidCliffTime
    );
    require!(
        cliff_time <= end_time,
        Error::Validation::Stream::InvalidCliffTime
    );

    // Ensure amount is positive
    require!(amount > 0, Error::Validation::Stream::InvalidAmount);

    // Prepare amounts struct
    let amounts = Amounts {
        deposited: amount,
        refunded: 0,
        withdrawn: 0,
    };

    // Initialize stream account
    *ctx.accounts.stream = LockupLinearStream {
        base_stream: BaseStream {
            id: stream_id.clone(),
            sender: *ctx.accounts.sender.key,
            token_mint: ctx.accounts.token_mint.key(),
            is_canceled: false,
            name: name.clone(),
            amounts,
            start_time,
            end_time,
            is_cancelable,
            is_transferable,
            recipient,
        },
        cliff_time,
    };
    msg!("LockupLinearStream created with ID: {}", stream_id);

    // Transfer tokens into treasury
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.treasury_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.token_mint.decimals)?;
    msg!("Transferred {} tokens to the treasury.", amount);

    // Increment stream counter
    stream_counter.stream_index += 1;
    msg!(
        "Stream index incremented to {}",
        stream_counter.stream_index
    );

    Ok(())
}

/// Context for creating a lockup linear stream.
#[derive(Accounts)]
pub struct CreateLockupLinearStream<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
        associated_token::token_program = token_program,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"LockupLinearStreamCounter"],
        bump,
    )]
    pub stream_counter: Account<'info, StreamCounter>,

    #[account(
        init,
        payer = sender,
        token::mint = token_mint,
        token::authority = treasury_token_account,
        seeds = [
            b"Treasury",
            token_mint.key().as_ref(),
            &stream_counter.stream_index.to_le_bytes()
        ],
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        space = ANCHOR_DISCRIMINATOR + LockupLinearStream::INIT_SPACE,
        payer = sender,
        seeds = [
            b"LockupLinearStream",
            sender.key().as_ref(),
            &stream_counter.stream_index.to_le_bytes()
        ],
        bump
    )]
    pub stream: Account<'info, LockupLinearStream>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
