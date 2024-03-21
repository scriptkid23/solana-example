import { Swapper } from "../Swapper/swapper";
import * as anchor from "@project-serum/anchor";

import {env} from "../env";
import { getAtaAccount } from "../utils/token";


const main= async()=>{
    const swap_token = new anchor.web3.PublicKey(env.swap_token);
    const swapper = new Swapper(swap_token);
 
    let deployerATA = await getAtaAccount(swap_token, swapper.deployer.publicKey);
    let amount = new anchor.BN(10000000); // 1 SOL
    await swapper.remove(swapper.deployer, deployerATA, amount);
}
  
main().catch(error => console.log(error));