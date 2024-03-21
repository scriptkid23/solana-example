import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import {env} from "./data";
import { SolanaSwap } from "./solana_swap";
const tokenMint = new anchor.web3.PublicKey(env.swap_token);

type SwapProps = {
  program: anchor.Program<SolanaSwap>;
  wallet: any;
  amount: anchor.BN
};

const CONTROLLER_SEED = "controller";
const ESCROW_SEED = "escrow";


interface PDAParam {
    key: anchor.web3.PublicKey,
    bump: number
}


const getAtaAccount = async(wallet: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> =>{
  
  let userAssociatedTokenAccount = await spl.getAssociatedTokenAddress(
      tokenMint,
      wallet
  )
  return userAssociatedTokenAccount
}





const getControllerPDA = async(program: any): Promise<PDAParam> => {
  const [pda, bump] = anchor.web3.PublicKey
  .findProgramAddressSync(
      [
      anchor.utils.bytes.utf8.encode(CONTROLLER_SEED),
      ],
      program.programId
  );

  return {
      key: pda,
      bump: bump
  }
}

const getEscrowPDA = async(program: any): Promise<PDAParam> => {
  const [pda, bump] = anchor.web3.PublicKey
  .findProgramAddressSync(
      [
      anchor.utils.bytes.utf8.encode(ESCROW_SEED)
      ],
      program.programId
  );

  return {
      key: pda,
      bump: bump
  }
}


export const buy_move = async({
  program,
  wallet,
  amount
}:SwapProps) => {
  let controllerPDA = await getControllerPDA(program);
  let escrowPDA = await getEscrowPDA(program);
  let userTokenAccount = await getAtaAccount(wallet.publicKey);

  console.log(wallet)
  console.log(amount)
  console.log(`Program id: ${program.programId.toBase58()}`)
  const result = await program.methods.buyMove(amount).accounts({
    user: wallet.publicKey,
      tokenMint: tokenMint, 
      controller: controllerPDA.key,
      escrow: escrowPDA.key, 
      userTokenAccount: userTokenAccount,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
}).signers([]).rpc();
return result;
}

export const sell_move = async({
  program,
  wallet,
  amount
}:SwapProps) => {
  let controllerPDA = await getControllerPDA(program);
  let escrowPDA = await getEscrowPDA(program);
  let userTokenAccount = await getAtaAccount(wallet.publicKey);

  console.log(wallet)
  console.log(amount)
  console.log(`User Token Account: ${userTokenAccount.toString()}`);
  console.log(`escrowPDA: ${escrowPDA.key.toString()}`);
  console.log(`controllerPDA: ${controllerPDA.key.toString()}`);
  
  
  console.log(`Program id: ${program.programId.toBase58()}`)
  const result = await program.methods.sellMove(amount).accounts({
  user: wallet.publicKey,
    tokenMint: tokenMint, 
    controller: controllerPDA.key,
    escrow: escrowPDA.key, 
    userTokenAccount: userTokenAccount,
    systemProgram: anchor.web3.SystemProgram.programId,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
    associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
  }).signers([]).rpc();
  return result
}
