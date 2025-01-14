use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LockupLinearStream {
    #[max_len(32)]
    pub id: String,
    #[max_len(32)]
    pub name: String,

    pub sender: Pubkey,
    pub recipient: Pubkey,

    pub amount: u64,
    pub token_mint: Pubkey,

    pub start_time: i64,
    pub cliff_time: i64,
    pub end_time: i64,

    pub is_cancelable: bool,
    pub is_canceled: bool,
    pub is_depleted: bool,
    pub is_transferable: bool,
}

#[account]
#[derive(InitSpace)]
pub struct LockupLinearStreamCounter {
    pub stream_index: u64,
}
