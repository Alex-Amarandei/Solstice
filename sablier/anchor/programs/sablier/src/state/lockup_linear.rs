use super::BaseStream;
use anchor_lang::prelude::*;

/// A lockup linear stream with an optional cliff time.
#[account]
#[derive(InitSpace)]
pub struct LockupLinearStream {
    pub base_stream: BaseStream,
    pub cliff_time: i64,
}
