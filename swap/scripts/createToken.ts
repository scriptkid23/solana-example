import {getDeployer, getProvider} from "./utils/provider";
import { createAssociatedWalletAndMint, createMintToken, createTokenMetadata } from "./utils/token";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";

const  main= async()=>{
    const deployer = getDeployer();
    const provider = getProvider(deployer);
    const mintAmount = BigInt(10000000000000); // 10 mil MOVE token

    let tokenMint = await createMintToken(provider, 6);
    console.log(`Mint successfully: ${tokenMint}`)
    await createAssociatedWalletAndMint(provider, deployer, tokenMint, mintAmount);

    const tokenMetadata = {
      name: "MOVE",
      symbol: "MOVE",
      uri: "https://assets.coingecko.com/coins/images/28917/large/BlueMoveCoin.png?1675742074",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null
    } as DataV2;
    await createTokenMetadata(provider,deployer, tokenMint, tokenMetadata);
}
  
main().catch(error => console.log(error));