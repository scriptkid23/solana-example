use crate::states::Controller;
use crate::{CONTROLLER_SEED, ESCROW_SEED};
use anchor_spl::token::{ Mint, TokenAccount};
use anchor_lang::prelude::*;

pub fn initialize(ctx: Context<Initialize>, move_per_sol: u8, decimal: u8) -> Result<()> {
    let controller = &mut ctx.accounts.controller;
    controller.authorizer = ctx.accounts.signer.key();
    controller.move_per_sol = move_per_sol;
    controller.decimal = decimal;
    controller.token_0_amount = 0;
    controller.token_1_amount = 0;
    controller.bump = *ctx.bumps.get(CONTROLLER_SEED).unwrap();
    controller.escrow_bump = *ctx.bumps.get(ESCROW_SEED).unwrap();
    msg!("action: initialize");
    msg!("authorizer: {}", ctx.accounts.signer.key());
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = signer,
        space = Controller::LEN,
        seeds = [CONTROLLER_SEED.as_bytes()],
        bump
    )]
    pub controller: Account<'info, Controller>,
    #[account(
        init, 
        payer = signer,
        seeds = [ESCROW_SEED.as_bytes()],
        bump,
        token::mint = token_mint,
        token::authority = controller,
    )]
    pub escrow: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous 
    pub token_program: AccountInfo<'info>
}
