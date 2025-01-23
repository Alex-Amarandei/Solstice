use anchor_lang::prelude::*;

use crate::{error::Error, validate_renounce, LockupLinearStream};

/// Renounces the cancelability of a lockup linear stream.
pub fn process_renounce_cancelability_lockup_linear_stream(
    ctx: Context<RenounceCancelabilityLockupLinearStream>,
) -> Result<()> {
    // Validate if renouncing cancelability is permitted
    validate_renounce(ctx.accounts.sender.key(), &ctx.accounts.stream.base_stream)?;

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
}
