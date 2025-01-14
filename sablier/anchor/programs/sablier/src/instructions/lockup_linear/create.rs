use crate::{LockupLinearStream, LockupLinearStreamCounter, ANCHOR_DISCRIMINATOR, error::ErrorCode};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface}
};

pub fn process_create_stream(
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
    // Uniquely define Stream based on the current stream index
    let stream_counter = &mut ctx.accounts.stream_counter;
    let stream_id = format!("LL-{}", stream_counter.stream_index);

    // Check the validity of the timestamps provided
    let clock = Clock::get()?;

    require!(start_time > clock.unix_timestamp, ErrorCode::InvalidStartTime);
    require!(start_time <= cliff_time, ErrorCode::InvalidCliffTime);
    require!(start_time <= end_time, ErrorCode::InvalidEndTime);

    // Check the validity of the amount provided
    require!(amount > 0, ErrorCode::InvalidAmount);

    // Initialize the LockupLinearStream account
    *ctx.accounts.lockup_linear_stream = LockupLinearStream {
        id: stream_id,
        sender: *ctx.accounts.sender.key,
        token_mint: ctx.accounts.token_mint.key(),
        is_canceled: false,
        is_depleted: false,
        name,
        recipient,
        amount,
        start_time,
        end_time,
        cliff_time,
        is_cancelable,
        is_transferable,
    };
    
    // Increment the stream index
    stream_counter.stream_index += 1;

    Ok(())
}

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
        init, 
        token::mint=token_mint, 
        token::authority=treasury_token_account, 
        payer=sender,
        seeds=[b"treasury", sender.key().as_ref()], 
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = sender,
        space = ANCHOR_DISCRIMINATOR + LockupLinearStreamCounter::INIT_SPACE,
        seeds = [b"LLStreamCounter"],
        bump,
    )]
    pub stream_counter: Account<'info, LockupLinearStreamCounter>,

    #[account(
        init, 
        space = ANCHOR_DISCRIMINATOR + LockupLinearStream::INIT_SPACE, 
        payer = sender, 
        seeds = [
            b"LLStream", 
            sender.key().as_ref(), 
            token_mint.key().as_ref(), 
            &stream_counter.stream_index.to_le_bytes()
        ], 
        bump
    )]
    pub lockup_linear_stream: Account<'info, LockupLinearStream>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
