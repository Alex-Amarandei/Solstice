#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use constants::*;
use instructions::*;
use state::*;

mod constants;
mod error;
mod instructions;
mod state;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod sablier {
    use super::*;

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
