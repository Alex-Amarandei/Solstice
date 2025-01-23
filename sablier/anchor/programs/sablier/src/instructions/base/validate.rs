use crate::{error::Error, BaseStream, StreamCounter, TEAM_PUB_KEY};
use anchor_lang::prelude::*;
use std::str::FromStr;

/// Validates conditions for creating a new stream.
pub fn validate_create(
    stream_counter: &Account<StreamCounter>,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
    let team_authority = Pubkey::from_str(TEAM_PUB_KEY).unwrap();
    require!(
        stream_counter.authority == team_authority,
        Error::Authorization::Counter::UnauthorizedCounter
    );

    let clock = Clock::get()?;
    require!(
        start_time >= clock.unix_timestamp,
        Error::Validation::Stream::InvalidStartTime
    );
    require!(
        start_time <= end_time,
        Error::Validation::Stream::InvalidEndTime
    );

    Ok(())
}

/// Validates if a stream can be canceled by the given sender.
pub fn validate_cancel(sender: Pubkey, base_stream: &BaseStream) -> Result<()> {
    require!(
        sender == base_stream.sender,
        Error::Authorization::Stream::UnauthorizedCancel
    );
    require!(
        !base_stream.is_canceled,
        Error::Validation::Stream::AlreadyCanceled
    );
    require!(
        base_stream.is_cancelable,
        Error::Validation::Stream::NotCancelable
    );
    require!(
        base_stream.end_time > Clock::get()?.unix_timestamp,
        Error::Validation::Stream::NotCancelablePastEndTime
    );

    Ok(())
}

/// Validates if a stream's cancelability can be renounced by the given sender.
pub fn validate_renounce(sender: Pubkey, base_stream: &BaseStream) -> Result<()> {
    require!(
        sender == base_stream.sender,
        Error::Authorization::Stream::UnauthorizedRenounce
    );
    require!(
        !base_stream.is_canceled,
        Error::Validation::Stream::AlreadyCanceled
    );
    require!(
        base_stream.is_cancelable,
        Error::Validation::Stream::NotCancelable
    );
    require!(
        base_stream.end_time > Clock::get()?.unix_timestamp,
        Error::Validation::Stream::NotRenounceablePastEndTime
    );

    Ok(())
}
