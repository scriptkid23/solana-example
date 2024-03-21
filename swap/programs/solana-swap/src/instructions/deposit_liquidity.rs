use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{Mint, TokenAccount, Transfer};

use crate::{
    constants::{CONTROLLER_SEED, ESCROW_SEED},
    errors::SwapErrors,
    states::Controller,
};

pub fn deposit(ctx: Context<Deposit>, amount_lamports: u64) -> Result<()> {
    let controller = &mut ctx.accounts.controller;
    let authorizer = &ctx.accounts.authorizer;
    let user_token_account = &mut ctx.accounts.user_token_account;
    let escrow = &mut ctx.accounts.escrow;
    let token_program = &ctx.accounts.token_program;

    let amount_move = controller.get_amount_move(amount_lamports);

    require!(
        authorizer.to_account_info().lamports() >= amount_lamports,
        SwapErrors::InsufficientFund
    );
    require!(
        user_token_account.amount >= amount_move,
        SwapErrors::InsufficientFund
    );

    // Transfer Move to escrow
    controller.token_1_amount += amount_move;

    let transfer_ix = Transfer {
        from: user_token_account.to_account_info(),
        to: escrow.to_account_info(),
        authority: authorizer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_ix);
    anchor_spl::token::transfer(cpi_ctx, amount_move)?;

    // Transfer Sol to controller
    controller.token_0_amount += amount_lamports;
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: authorizer.to_account_info(),
            to: controller.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount_lamports)?;
    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authorizer: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        has_one = authorizer,
        seeds = [CONTROLLER_SEED.as_bytes()], bump = controller.bump
    )]
    pub controller: Account<'info, Controller>,
    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes()], bump = controller.escrow_bump
    )]
    pub escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authorizer,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous
    pub associated_token_program: AccountInfo<'info>,
}
