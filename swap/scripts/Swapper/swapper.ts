import * as anchor from "@project-serum/anchor";
import * as solana from "@solana/web3.js";
import {getDeployer, getProvider} from "../utils/provider";


const CONTROLLER_SEED = "controller";
const ESCROW_SEED = "escrow";


interface PDAParam {
    key: anchor.web3.PublicKey,
    bump: number
}

export class Swapper { 
    tokenMint: anchor.web3.PublicKey;
    deployer: solana.Keypair;
    provider: anchor.AnchorProvider;
    program: anchor.Program;

    constructor(
        tokenMint: anchor.web3.PublicKey,
        provider?: anchor.AnchorProvider, 
        deployer?: anchor.web3.Keypair
    ){
        //local net  
      if (provider){
        this.provider = provider;

        if (!deployer){
          console.log("----------- Require custom deployer for testing -----------");
          process.exit(1);
        }
        this.deployer= deployer;
      }
      
      //devnet or mainnet
      else{
        this.deployer = getDeployer();
        this.provider = getProvider(this.deployer);
      }
      
      anchor.setProvider(this.provider);    
    
        this.program = anchor.workspace.SolanaSwap;
        this.tokenMint = tokenMint
    }


    getController = async(): Promise<PDAParam> => {
        const [pda, bump] =  anchor.web3.PublicKey
        .findProgramAddressSync(
            [
            anchor.utils.bytes.utf8.encode(CONTROLLER_SEED),
            ],
            this.program.programId
        );

        return {
            key: pda,
            bump: bump
        }
    }

    getEscrow = async(): Promise<PDAParam> => {
        const [pda, bump] =  anchor.web3.PublicKey
        .findProgramAddressSync(
            [
            anchor.utils.bytes.utf8.encode(ESCROW_SEED),
            ],
            this.program.programId
        );

        return {
            key: pda,
            bump: bump
        }
    }

    initialize = async(
        authorizer: anchor.web3.Keypair, 
        move_per_sol: number, 
        token_decimal: number
    )=> {
        let controllerPDA = await this.getController();
        let escrowPDA = await this.getEscrow();

        return await this.program.methods.initialize(move_per_sol, token_decimal).accounts({
            signer: authorizer.publicKey,
            tokenMint: this.tokenMint,
            controller: controllerPDA.key,
            escrow: escrowPDA.key
        }).signers([authorizer]).rpc();
    }


    buy_move = async(user: anchor.web3.Keypair, userTokenAccount: anchor.web3.PublicKey, amount: anchor.BN)=> {
        let controllerPDA = await this.getController();
        let escrowPDA = await this.getEscrow();

        return await this.program.methods.buyMove(amount).accounts({
            user: user.publicKey,
            controller: controllerPDA.key,
            tokenMint: this.tokenMint, 
            escrow: escrowPDA.key, 
            userTokenAccount: userTokenAccount
        }).signers([user]).rpc();
    }

    sell_move = async(user: anchor.web3.Keypair, userTokenAccount: anchor.web3.PublicKey, amount: anchor.BN)=> {
        let controllerPDA = await this.getController();
        let escrowPDA = await this.getEscrow();


        console.log("controllerPDA", controllerPDA.key.toString());
        console.log("escrowPDA", escrowPDA.key.toString());
        return await this.program.methods.sellMove(amount).accounts({
            user: user.publicKey,
            controller: controllerPDA.key,
            tokenMint: this.tokenMint, 
            escrow: escrowPDA.key, 
            userTokenAccount: userTokenAccount
        }).signers([user]).rpc();
    }

    deposit = async(user: anchor.web3.Keypair, userTokenAccount: anchor.web3.PublicKey, amount: anchor.BN)=> {
        let controllerPDA = await this.getController();
        let escrowPDA = await this.getEscrow();

        return await this.program.methods.depositLiquidity(amount).accounts({
            authorizer: user.publicKey,
            controller: controllerPDA.key,
            tokenMint: this.tokenMint, 
            escrow: escrowPDA.key, 
            userTokenAccount: userTokenAccount
        }).signers([user]).rpc();
    }
    remove = async(user: anchor.web3.Keypair, userTokenAccount: anchor.web3.PublicKey, amount: anchor.BN)=> {
        let controllerPDA = await this.getController();
        let escrowPDA = await this.getEscrow();

        return await this.program.methods.removeLiquidity(amount).accounts({
            authorizer: user.publicKey,
            controller: controllerPDA.key,
            tokenMint: this.tokenMint, 
            escrow: escrowPDA.key, 
            userTokenAccount: userTokenAccount
        }).signers([user]).rpc();
    }
}