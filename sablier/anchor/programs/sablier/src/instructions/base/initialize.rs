use crate::{error::Error, StreamCounter, TEAM_PUB_KEY};
use anchor_lang::prelude::*;
use std::str::FromStr;

/// Initializes the stream counter with the specified authority.
pub fn initialize_stream_counter(sender: Pubkey, stream_counter: &mut StreamCounter) -> Result<()> {
    // Verify authority
    let allowed_authority = Pubkey::from_str(TEAM_PUB_KEY).unwrap();
    require!(
        sender == allowed_authority,
        Error::Authorization::Counter::UnauthorizedCreator
    );

    // Set initial values
    stream_counter.stream_index = 0;
    stream_counter.authority = sender;

    msg!(
        "StreamCounter initialized with stream_index: {}",
        stream_counter.stream_index
    );
    Ok(())
}
