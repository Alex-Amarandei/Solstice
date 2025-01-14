#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use constants::*;
use instructions::*;
use state::*;

mod constants;
mod error;
mod instructions;
mod state;

declare_id!("7bQwRRQErWVNRczPTGbg7rtALWCHDhGn8sUvkAZYFt4d");

#[program]
pub mod sablier {
    use super::*;

    pub fn initialize_stream_counter(ctx: Context<InitializeStreamCounter>) -> Result<()> {
        process_initialize_stream_counter(ctx)
    }

    pub fn create_stream(
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
        process_create_stream(
            ctx,
            name,
            recipient,
            amount,
            start_time,
            end_time,
            cliff_time,
            is_cancelable,
            is_transferable,
        )
    }
}
