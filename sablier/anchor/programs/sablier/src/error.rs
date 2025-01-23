/// Defines custom error categories and codes for validation and authorization checks.
#[allow(non_snake_case)]
pub mod Error {
    pub mod Validation {
        use anchor_lang::prelude::*;

        #[error_code]
        pub enum Stream {
            #[msg("Stream is already canceled")]
            AlreadyCanceled,

            #[msg("Amount must be greater than 0")]
            InvalidAmount,

            #[msg("Cliff time must be between start and end time")]
            InvalidCliffTime,

            #[msg("End time must be after start time")]
            InvalidEndTime,

            #[msg("Start time must not be in the past")]
            InvalidStartTime,

            #[msg("Stream Id is not in the correct format")]
            InvalidStreamIdFormat,

            #[msg("Stream is not cancelable")]
            NotCancelable,

            #[msg("Stream is not cancelable after the end time has passed")]
            NotCancelablePastEndTime,

            #[msg("Stream cancelability is not renounceable after the end time has passed")]
            NotRenounceablePastEndTime,
        }
    }

    pub mod Authorization {
        use anchor_lang::prelude::*;

        #[error_code]
        pub enum Stream {
            #[msg("Only the Stream's Creator can cancel the Stream")]
            UnauthorizedCancel,

            #[msg("Only the Stream's Creator can renounce the Stream's cancelability")]
            UnauthorizedRenounce,
        }

        #[error_code]
        pub enum Counter {
            #[msg("Stream Counter creator is unauthorized")]
            UnauthorizedCreator,

            #[msg("The Stream Counter used is unauthorized by the Sablier Team")]
            UnauthorizedCounter,
        }
    }
}
