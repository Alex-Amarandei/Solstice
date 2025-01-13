#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod Sablier {
    use super::*;

  pub fn close(_ctx: Context<CloseSablier>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Sablier.count = ctx.accounts.Sablier.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Sablier.count = ctx.accounts.Sablier.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeSablier>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.Sablier.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeSablier<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Sablier::INIT_SPACE,
  payer = payer
  )]
  pub Sablier: Account<'info, Sablier>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseSablier<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub Sablier: Account<'info, Sablier>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub Sablier: Account<'info, Sablier>,
}

#[account]
#[derive(InitSpace)]
pub struct Sablier {
  count: u8,
}
