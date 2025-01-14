use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Start time must not be in the past")]
    InvalidStartTime,

    #[msg("Cliff time must be after start time")]
    InvalidCliffTime,

    #[msg("End time must be after start time")]
    InvalidEndTime,

    #[msg("Amount must be greater than 0")]
    InvalidAmount,
}
