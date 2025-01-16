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

    pub token_mint: Pubkey,

    pub amounts: Amounts,

    pub milestones: Milestones,

    pub is_cancelable: bool,
    pub is_canceled: bool,
    pub is_transferable: bool,
}

#[derive(Clone, InitSpace, AnchorSerialize, AnchorDeserialize)]
pub struct Amounts {
    pub deposited: u64,
    pub refunded: u64,
    pub withdrawn: u64,
}

#[derive(Clone, InitSpace, AnchorSerialize, AnchorDeserialize)]
pub struct Milestones {
    pub start_time: i64,
    pub cliff_time: i64,
    pub end_time: i64,
}

#[account]
#[derive(InitSpace)]
pub struct LockupLinearStreamCounter {
    pub stream_index: u64,
    // ! TODO: Add authority for enforcing team control
    // pub authority: Pubkey, // Enforce team control
}
