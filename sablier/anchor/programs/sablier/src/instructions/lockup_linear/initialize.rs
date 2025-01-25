use crate::{
    initialize_stream_counter, seeds::LOCKUP_LINEAR_STREAM_COUNTER, StreamCounter,
    ANCHOR_DISCRIMINATOR,
};
use anchor_lang::prelude::*;

/// Initializes the lockup linear stream counter account.
pub fn process_initialize_lockup_linear_stream_counter(
    ctx: Context<InitializeLockupLinearStreamCounter>,
) -> Result<()> {
    initialize_stream_counter(ctx.accounts.sender.key(), &mut ctx.accounts.stream_counter)
}

/// Context for `initialize_lockup_linear_stream_counter`.
#[derive(Accounts)]
pub struct InitializeLockupLinearStreamCounter<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        init,
        payer = sender,
        space = ANCHOR_DISCRIMINATOR + StreamCounter::INIT_SPACE,
        seeds = [LOCKUP_LINEAR_STREAM_COUNTER.as_ref()],
        bump
    )]
    pub stream_counter: Account<'info, StreamCounter>,

    pub system_program: Program<'info, System>,
}
