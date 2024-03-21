import { Swapper } from "../Swapper/swapper";
import * as anchor from "@project-serum/anchor";

import {env} from "../env";


const MOVE_PER_SOL = 10; // 1 SOL = 10 MOVE
const MOVE_DECIMAL = 6;


const  main= async()=>{
    const swap_token = new anchor.web3.PublicKey(env.swap_token);
    const swapper = new Swapper( swap_token);
    
    await swapper.initialize(swapper.deployer, MOVE_PER_SOL, MOVE_DECIMAL);
}
  
  main().catch(error => console.log(error));