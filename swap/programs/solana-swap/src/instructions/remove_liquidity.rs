use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Transfer};

use crate::{
    constants::{CONTROLLER_SEED, ESCROW_SEED},
    errors::SwapErrors,
    states::Controller,
};

pub fn remove(ctx: Context<Remove>, amount_lamports: u64) -> Result<()> {
    let controller = &mut ctx.accounts.controller;
    let authorizer = &ctx.accounts.authorizer;
    let user_token_account = &mut ctx.accounts.user_token_account;
    let escrow = &mut ctx.accounts.escrow;
    let token_program = &ctx.accounts.token_program;

    let amount_move = controller.get_amount_move(amount_lamports);

    require!(
        controller.to_account_info().lamports() >= amount_lamports,
        SwapErrors::InsufficientFund
    );
    require!(escrow.amount >= amount_move, SwapErrors::InsufficientFund);

    // Transfer Move to authorizer
    let amounts_out = controller.get_amount_move(amount_lamports);
    require!(escrow.amount >= amounts_out, SwapErrors::InsufficientFund);
    controller.token_1_amount -= amounts_out;
    let bump_vector = controller.bump.to_le_bytes();

    let inner = vec![CONTROLLER_SEED.as_bytes(), bump_vector.as_ref()];
    let outer = vec![inner.as_slice()];

    let transfer_ix = Transfer {
        from: escrow.to_account_info(),
        to: user_token_account.to_account_info(),
        authority: controller.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_ix,
        outer.as_slice(),
    );
    anchor_spl::token::transfer(cpi_ctx, amounts_out)?;

    // Transfer Sol to authorizer
    controller.token_0_amount -= amount_lamports;
    **controller.to_account_info().try_borrow_mut_lamports()? -= amount_lamports;
    **authorizer.try_borrow_mut_lamports()? += amount_lamports;
    Ok(())
}

#[derive(Accounts)]
pub struct Remove<'info> {
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
