use crate::error::Error;

pub fn extract_stream_counter_index(id: &str) -> [u8; 8] {
    id.split('-')
        .nth(1)
        .and_then(|index| index.parse::<u64>().ok())
        .expect(
            Error::Validation::Stream::InvalidStreamIdFormat
                .to_string()
                .as_str(),
        )
        .to_le_bytes()
}
