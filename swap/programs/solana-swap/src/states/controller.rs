use anchor_lang::prelude::*;
const SOL_TO_LAMPORTS: u128 = 1000000000;

#[account]
pub struct Controller {
    pub authorizer: Pubkey,
    pub move_per_sol: u8,
    pub decimal: u8,
    pub token_0_amount: u64,
    pub token_1_amount: u64,
    pub bump: u8,
    pub escrow_bump: u8,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;

const U8_SIZE_LENGTH: usize = 1;
const U64_SIZE_LENGTH: usize = 8;

impl Controller {
    //todo: implement LEN for the struct data
    pub const LEN: usize =
        DISCRIMINATOR_LENGTH + PUBLIC_KEY_LENGTH + U8_SIZE_LENGTH * 4 + U64_SIZE_LENGTH * 2;
    pub fn get_amount_move(&self, lamports: u64) -> u64 {
        let amount =
            (lamports as u128) * (self.move_per_sol as u128) * 10u128.pow(self.decimal as u32)
                / SOL_TO_LAMPORTS;
        amount as u64
    }
    pub fn get_amount_lamports(&self, amount_move: u64) -> u64 {
        let lamports = (amount_move as u128) * SOL_TO_LAMPORTS
            / (self.move_per_sol as u128 * 10u128.pow(self.decimal as u32));
        lamports as u64
    }
}
