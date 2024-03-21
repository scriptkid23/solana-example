import { Swapper } from "../Swapper/swapper";
import * as anchor from "@project-serum/anchor";

import {env} from "../env";
import { getAtaAccount } from "../utils/token";


const main= async()=>{
    const swap_token = new anchor.web3.PublicKey(env.swap_token);
    const swapper = new Swapper(swap_token);
 
    let deployerATA = await getAtaAccount(swap_token, swapper.deployer.publicKey);
    let swapAmount = new anchor.BN(1000000000); // 1 SOL -> get 10 MOVE
    await swapper.buy_move(swapper.deployer, deployerATA, swapAmount);
}
  
main().catch(error => console.log(error));