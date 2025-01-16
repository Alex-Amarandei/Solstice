use anchor_lang::prelude::*;
use crate::{ANCHOR_DISCRIMINATOR, LockupLinearStreamCounter};

pub fn process_initialize_stream_counter(ctx: Context<InitializeStreamCounter>) -> Result<()> {
    let stream_counter = &mut ctx.accounts.stream_counter;
    stream_counter.stream_index = 0;
    // ! TODO: Add authority for enforcing team control
    // stream_counter.authority = ctx.accounts.sender.key();

    msg!("StreamCounter initialized with stream_index: {}", stream_counter.stream_index);

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStreamCounter<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init, 
        payer = sender, 
        space = ANCHOR_DISCRIMINATOR + LockupLinearStreamCounter::INIT_SPACE,
        seeds = [b"LLStreamCounter"],
        bump
    )]
    pub stream_counter: Account<'info, LockupLinearStreamCounter>,

    pub system_program: Program<'info, System>,
}
