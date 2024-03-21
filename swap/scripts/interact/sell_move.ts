import { Swapper } from "../Swapper/swapper";
import * as anchor from "@project-serum/anchor";

import {env} from "../env";
import { getAtaAccount } from "../utils/token";


const main= async()=>{
    const swap_token = new anchor.web3.PublicKey(env.swap_token);
    const swapper = new Swapper(swap_token);
 
    let deployerATA = await getAtaAccount(swap_token, swapper.deployer.publicKey);
    let swapAmount = new anchor.BN(10000000); // 10 MOVE -> get 1 SOL
    await swapper.sell_move(swapper.deployer, deployerATA, swapAmount);
}
  
main().catch(error => console.log(error));