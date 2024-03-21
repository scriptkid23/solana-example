# SOLANA SWAP CONTRACT

A smart contract that allow swap between SOL and MOVE tokens.

## Demo website

- https://solana-swap-ashy.vercel.app/
- Mint token address on Devnet
  5XzHzDAodUPDsXsXGHUJby7U3Ydepu5Ufd65hPece3vw

## Program structure

The program using the following mechanism to handle the swap from SOL to MOVE tokens.

Generally, the state of the program is stored in programs/solana-swap-dapp/src/state/ folder
The instructions is stored in programs/solana-swap-dapp/src/instructions/ folder

1. An `authorizer` intitalize a `controller` account, along with an `escrow`, via the function instructions/initialize.ts. The `controller` and the `escrow` are constructed as the PDAs from the CONTROLLER_SEED AND ESCROW_SEED.

2. The `controller` holds information about how to perform swap, including `authorizer` - creator of the program, who will be able to add or remove liquidity, `move_per_sol` - how much MOVE a user will receive when he swap SOL for MOVE, and other information (please check programs/src/state/controller.rs). For example, if the `move_per_sol` is 10, the user can swap 1 SOL for 10 MOVE tokens. Controller also receives and holds SOL from the `buy operation`, and the controller allows the `authorizer` to get SOL and MOVE back when remove liquidity.

3. In order for the user to `buy_move`, `authorizer` needs to call `deposit` to provide the liquidity.

4. When a user buy Move, he sends some SOL to the program, and receive back some MOVE tokens. The operation is perform via the `buy_move` functions. -- instructions/swap.rs

5. When a user sell Move, he sends some MOVE tokens to the program, and receive back SOL. The operation is perform via the `sell_move` functions. -- instructions/swap.rs

6. The `authorizer` can remove liquidity via the `remove` functions. -- instructions/remove.rs

## Deployment

This should be done like any Anchor project, so I will not elaborate

## Interactive scripts

### Environment

Add your private key to the file scripts/secrete.json in order to use the scripts and interact with the blockchain, under the following format

```
{
    "private_key": [164, 238, ....., 124]
}
```

### Token

To create new tokens, run `ts-node scripts/create_token.ts`

**_NOTE:_** The `MOVE` token metadata and uri for this project is temporaraly stored in the folder programs/solana-swap-dapp/metda

### Interact with the program

Run the following `ts-node scripts/interact/*.ts` to interact with each functions of the program.

**_NOTE:_**: In order to interact with all the scripts, we need to `initialize` the program first (creating controller and escrow accounts) by using file `initialize.ts`. And each time you initialize, you need to provide either different `internal_id` or `token_mint`, which is located inside the `data.ts`. These data will be used to calculate the PDA needed to interact with the program properly.

## Testing

The testing scripts is located in the `tests\` folders

Run `anchor test` to test the program

**_NOTE:_** Before run the test, change the config in the `Anchor.toml` from devnet to localnet to test on the local.
