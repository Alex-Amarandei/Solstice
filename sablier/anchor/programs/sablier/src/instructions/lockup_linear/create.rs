use crate::{error::ErrorCode, Amounts, LockupLinearStream, LockupLinearStreamCounter, Milestones, ANCHOR_DISCRIMINATOR};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}
};

pub fn process_create_stream(
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
    // Log entry into the function
    msg!("Processing CreateLockupLinearStream...");
    
    // Uniquely define Stream based on the current stream index
    let stream_counter = &mut ctx.accounts.stream_counter;

    // ! TODO: Add authority for enforcing team control
    // // Ensure the authority is valid
    // let team_authority = Pubkey::from_str("YourTeamWalletPublicKeyHere").unwrap();
    // require!(
    //     stream_counter.authority == team_authority,
    //     ErrorCode::UnauthorizedStreamCounter
    // );

    let stream_id = format!("LL-{}", stream_counter.stream_index);
    msg!("Stream ID: {}", stream_id);

    let pda = ctx.accounts.lockup_linear_stream.key();
    msg!("Derived PDA for LockupLinearStream: {}", pda);

    // Check the validity of the timestamps provided
    let clock = Clock::get()?;
    msg!("Current timestamp: {}", clock.unix_timestamp);

    require!(start_time > clock.unix_timestamp, ErrorCode::InvalidStartTime);
    require!(start_time <= cliff_time, ErrorCode::InvalidCliffTime);
    require!(start_time <= end_time, ErrorCode::InvalidEndTime);

    // Log timestamp values
    msg!(
        "Start time: {}, Cliff time: {}, End time: {}",
        start_time,
        cliff_time,
        end_time
    );

    // Check the validity of the amount provided
    require!(amount > 0, ErrorCode::InvalidAmount);
    msg!("Amount validated: {}", amount);

    let amounts = Amounts {
        deposited: amount,
        refunded: 0,
        withdrawn: 0,
    };

    let milestones = Milestones {
        start_time,
        cliff_time,
        end_time,
    };

    // Initialize the LockupLinearStream account
    *ctx.accounts.lockup_linear_stream = LockupLinearStream {
        id: stream_id.clone(),
        sender: *ctx.accounts.sender.key,
        token_mint: ctx.accounts.token_mint.key(),
        is_canceled: false,
        name: name.clone(),
        amounts,
        milestones,
        is_cancelable,
        is_transferable,
        recipient,
    };
    msg!("LockupLinearStream initialized with ID: {}", stream_id);

    // Transfer the amount from sender's token account to the treasury token account
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.treasury_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    transfer_checked(cpi_ctx, amount, ctx.accounts.token_mint.decimals)?;
    msg!("Transferred {} tokens from sender to Stream {}", amount, stream_id);

    // Increment the stream index
    stream_counter.stream_index += 1;
    msg!("Stream index incremented to {}", stream_counter.stream_index);

    Ok(())
}

#[derive(Accounts)]
pub struct CreateLockupLinearStream<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
        associated_token::token_program = token_program,
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"LLStreamCounter"],
        bump,
    )]
    pub stream_counter: Account<'info, LockupLinearStreamCounter>,

    #[account(
        init, 
        payer = sender,
        token::mint = token_mint, 
        token::authority = treasury_token_account, 
        seeds = [b"Treasury", sender.key().as_ref(), &stream_counter.stream_index.to_le_bytes()], 
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init, 
        space = ANCHOR_DISCRIMINATOR + LockupLinearStream::INIT_SPACE, 
        payer = sender, 
        seeds = [
            b"LLStream", 
            sender.key().as_ref(), 
            token_mint.key().as_ref(), 
            &stream_counter.stream_index.to_le_bytes()
        ], 
        bump
    )]
    pub lockup_linear_stream: Account<'info, LockupLinearStream>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
