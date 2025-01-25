use anchor_lang::prelude::*;

use crate::{
    extract_stream_counter_index, seeds::LOCKUP_LINEAR_STREAM, validate_renounce,
    LockupLinearStream,
};

/// Renounces the cancelability of a lockup linear stream.
pub fn process_renounce_cancelability_lockup_linear_stream(
    ctx: Context<RenounceCancelabilityLockupLinearStream>,
) -> Result<()> {
    msg!("Validating Renounce Operation... 🛂");
    validate_renounce(ctx.accounts.sender.key(), &ctx.accounts.stream.base_stream)?;
    msg!("Validation successful! ✅ Renouncing cancelability... ⏳");

    let base_stream = &mut ctx.accounts.stream.base_stream;

    // Mark the stream as no longer cancelable
    base_stream.is_cancelable = false;
    Ok(())
}

/// Accounts for `renounce_cancelability_lockup_linear_stream`.
#[derive(Accounts)]
pub struct RenounceCancelabilityLockupLinearStream<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        seeds = [
            LOCKUP_LINEAR_STREAM.as_ref(),
            &extract_stream_counter_index(&stream.base_stream.id),
        ],
        bump
    )]
    pub stream: Account<'info, LockupLinearStream>,
}
