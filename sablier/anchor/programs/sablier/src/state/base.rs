use anchor_lang::prelude::*;

/// Stores base information for a stream.
#[account]
#[derive(InitSpace)]
pub struct BaseStream {
    #[max_len(32)]
    pub id: String,
    #[max_len(32)]
    pub name: String,

    pub sender: Pubkey,
    pub recipient: Pubkey,

    pub token_mint: Pubkey,

    pub amounts: Amounts,

    pub start_time: i64,
    pub end_time: i64,

    pub is_cancelable: bool,
    pub is_canceled: bool,
    pub is_transferable: bool,
}

/// Holds the deposited, refunded, and withdrawn token amounts.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Amounts {
    pub deposited: u64,
    pub refunded: u64,
    pub withdrawn: u64,
}

/// Maintains a running index for stream creation.
#[account]
#[derive(InitSpace)]
pub struct StreamCounter {
    pub stream_index: u64,
    pub authority: Pubkey,
}
