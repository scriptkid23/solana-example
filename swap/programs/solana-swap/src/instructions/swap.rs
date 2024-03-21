use crate::errors::SwapErrors;
use crate::states::Controller;
use crate::{CONTROLLER_SEED, ESCROW_SEED};
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{Mint, TokenAccount, Transfer};

pub fn buy_move(ctx: Context<BuyMove>, amount: u64) -> Result<()> {
    let user = &mut ctx.accounts.user;
    let controller = &mut ctx.accounts.controller;

    let escrow = &mut ctx.accounts.escrow;
    let user_token_account = &mut ctx.accounts.user_token_account;
    let token_program = &ctx.accounts.token_program;

    // Get SOL from the User
    controller.token_0_amount += amount;
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: user.to_account_info(),
            to: controller.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;

    // Transfer Move back to User
    let amounts_out = controller.get_amount_move(amount);
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
    Ok(())
}

pub fn sell_move(ctx: Context<SellMove>, amount: u64) -> Result<()> {
    let user = &ctx.accounts.user;
    let controller = &mut ctx.accounts.controller;

    let escrow = &mut ctx.accounts.escrow;
    let user_token_account = &mut ctx.accounts.user_token_account;
    let token_program = &ctx.accounts.token_program;

    // Get Move from User
    require!(
        user_token_account.amount >= amount,
        SwapErrors::InsufficientFund
    );
    controller.token_1_amount += amount;

    let transfer_ix = Transfer {
        from: user_token_account.to_account_info(),
        to: escrow.to_account_info(),
        authority: user.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_ix);
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    // Transfer SOL back to User
    let amount_lamports = controller.get_amount_lamports(amount);
    let lmps: u64 = controller.to_account_info().lamports();
    require!(lmps >= amount_lamports, SwapErrors::InsufficientFund);
    controller.token_0_amount -= amount_lamports;

    **controller.to_account_info().try_borrow_mut_lamports()? -= amount_lamports;
    **user.try_borrow_mut_lamports()? += amount_lamports;
    Ok(())
}

#[derive(Accounts)]
pub struct BuyMove<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [CONTROLLER_SEED.as_bytes()], bump = controller.bump
    )]
    pub controller: Account<'info, Controller>,

    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes()], bump = controller.escrow_bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,

    /// CHECK: This is not dangerous
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous
    pub associated_token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SellMove<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
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
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,

    /// CHECK: This is not dangerous
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous
    pub associated_token_program: AccountInfo<'info>,
}
