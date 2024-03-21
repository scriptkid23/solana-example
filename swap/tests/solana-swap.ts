import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Swapper } from "../scripts/Swapper/swapper";
import { createMintToken, createUserAndAssociatedWallet, getSplBalance, transferToken } from "../scripts/utils/token";
import { SolanaSwap } from "../target/types/solana_swap";
import * as assert from "assert";


const MOVE_DECIMAL = 6;
const MOVE_PER_SOL = 10;
const solAmount = new anchor.BN(1000000000); // Bob is going to swap 1 SOL for 10 MOVE
const moveAmount = new anchor.BN(10000000)
let expectedReceiveAmount= null; // Expected amount that Bob is going to receive
const depositAmount = 10000000; // Amount that alice use to deposit to the escrow (add liquidity)
describe("solana-swap", () => {
   // Configure the client to use the local cluster.
   const provider = anchor.AnchorProvider.env();
   anchor.setProvider(provider);
 
   const program = anchor.workspace.SolanaSwapDapp as Program<SolanaSwap>;

   let swapper: Swapper;
 
   // We are going to work with this MOVE token latter
   let token_mint: anchor.web3.PublicKey;
 
   let deployer: anchor.web3.Keypair;
   let deployer_token_wallet: anchor.web3.PublicKey;
 
   let alice: anchor.web3.Keypair;
   let alice_token_wallet: anchor.web3.PublicKey;
 
   let bob: anchor.web3.Keypair;
   let bob_token_wallet: anchor.web3.PublicKey;
 
   const SOL_TO_LAMPORT = new anchor.BN(1000000000)
 
   const INITIAL_DEPLOYER_BALANCE = BigInt(1000000000000);
   const INITIAL_ALICE_TOKEN_BALANCE = BigInt(10000000000);

   it("Set up test space!", async () => {
    
    /**
     * Swapper: the contract instance in which we can use to test and interact with the blockchain 
     * 
     * token_mint: The mint address of the MOVE token. 
     * 
     * deployer, deployer_token_wallet: The initializer of the contract, and add liquidity (The escrow contract token - not added yet)
     * alice - alice_token_wallet: Alice wallet is created, and she will get some MOVE tokens.
     * bob - bob_token_wallet: Bob and his ata token account will be created, but he gets no MOVE token initially
     */
    token_mint = await createMintToken(provider, MOVE_DECIMAL);
    
    [deployer, deployer_token_wallet] = await createUserAndAssociatedWallet(provider,token_mint,true, INITIAL_DEPLOYER_BALANCE); 
    [alice, alice_token_wallet] = await createUserAndAssociatedWallet(provider,token_mint,true, INITIAL_ALICE_TOKEN_BALANCE);
    [bob, bob_token_wallet] = await createUserAndAssociatedWallet(provider,token_mint,false); 

    swapper = new Swapper(token_mint, provider, deployer);
  });
  it("Inititalize", async()=>{
    await swapper.initialize(deployer, MOVE_PER_SOL, MOVE_DECIMAL);

    let controller = await swapper.getController();
    let escrow = await swapper.getEscrow();

    let controllerInfo =  await swapper.provider.connection.getAccountInfo(controller.key);
    let escrowInfo =  await swapper.provider.connection.getAccountInfo(controller.key);

    assert.ok(controllerInfo.lamports > 0, "Controller has not been created");
    assert.ok(escrowInfo.lamports > 0, "Escrow has not been created");
  })
  it("Deposit", async()=>{
    const controller = await swapper.getController();
    let escrow = await swapper.getEscrow(); 
    let controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceBefore = controllerInfo.lamports;

    let deployerInfo = await swapper.provider.connection.getAccountInfo(deployer.publicKey);
    let deployerBalanceBefore = deployerInfo.lamports;

    let deployerTokenBalanceBefore = await getSplBalance(swapper.provider, deployer_token_wallet);
    let escrowTokenBalanceBefore = await getSplBalance(swapper.provider, escrow.key);

    // Deployer deposit twice
    await swapper.deposit(deployer, deployer_token_wallet, solAmount);
    await swapper.deposit(deployer, deployer_token_wallet, solAmount);

    let escrowTokenBalanceAfter = await getSplBalance(swapper.provider, escrow.key);

    let deployerTokenBalanceAfter = await getSplBalance(swapper.provider, deployer_token_wallet);

    controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceAfter = controllerInfo.lamports;

    deployerInfo = await swapper.provider.connection.getAccountInfo(deployer.publicKey);
    let deployerBalanceAfter = deployerInfo.lamports;
     // ASSERTION
    /**
     * Controller SOL balance should increase by: 2 SOL (2 * 10^9 lamports)
     * Escrow balance should increase by: 20 MOVE (20 * 10^MOVE_DECIMAL) 
     * Deployer SOL balance should decrease by: 2 SOL (2 * 10^9 lamports)
     */
    assert.ok(deployerBalanceBefore - deployerBalanceAfter >= 2*solAmount.toNumber(), "Deployer balance should be deducted by an amount greater than 2 SOL");
    assert.ok(controllerBalanceAfter - controllerBalanceBefore == 2*solAmount.toNumber(), "Controller Balance should increase by an swap amount");
    let expectedTokenAmount = solAmount.mul(new anchor.BN(MOVE_PER_SOL)).mul(new anchor.BN(10).pow(new anchor.BN(MOVE_DECIMAL))).div(SOL_TO_LAMPORT);
    assert.ok(Number(escrowTokenBalanceAfter) - Number(escrowTokenBalanceBefore) == 2*expectedTokenAmount.toNumber(),"Escrow Token balance should increase by 2 expected amount");
    assert.ok(Number(deployerTokenBalanceBefore) - Number(deployerTokenBalanceAfter) == 2*expectedTokenAmount.toNumber(), "Deployer Token balance should decrease by 2 expected amount");
  })
  it("Buy Move", async()=>{ 
    const controller = await swapper.getController();
    let controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceBeforeSwap = controllerInfo.lamports;
    
    let bobInfo = await swapper.provider.connection.getAccountInfo(bob.publicKey);
    let bobBalanceBeforeSwap = bobInfo.lamports;

    // Bob buy Move
    await swapper.buy_move(bob, bob_token_wallet, solAmount);

    controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceAfterSwap = controllerInfo.lamports;

    bobInfo = await swapper.provider.connection.getAccountInfo(bob.publicKey);
    let bobBalanceAfterSwap = bobInfo.lamports;

     // ASSERTION
    /**
     * Controller SOL balance should increase by: 1 SOL (10^9 lamports)
     * Bob token wallet balance should increase by: 10 MOVE (10 * 10^MOVE_DECIMAL) 
     */
    assert.ok(bobBalanceBeforeSwap - bobBalanceAfterSwap >= solAmount.toNumber(), "Bob balance should be deducted by an amount greater than 1 SOL"); // bob pay some lamports for gas fee 
    assert.ok(controllerBalanceAfterSwap - controllerBalanceBeforeSwap == solAmount.toNumber(), "Controller Balance should increase by an swap amount");
    let bobMoveBalance = await getSplBalance(swapper.provider, bob_token_wallet);

    expectedReceiveAmount = solAmount.mul(new anchor.BN(MOVE_PER_SOL)).mul(new anchor.BN(10).pow(new anchor.BN(MOVE_DECIMAL))).div(SOL_TO_LAMPORT)
    assert.ok(expectedReceiveAmount.toNumber() == Number(bobMoveBalance), "Bob receive an incorect amount");
  })  

  it("Sell Move", async()=>{
    const controller = await swapper.getController();
    let controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);

    expectedReceiveAmount = moveAmount.mul(SOL_TO_LAMPORT).div(new anchor.BN(MOVE_PER_SOL)).div(new anchor.BN(10).pow(new anchor.BN(MOVE_DECIMAL)))

    let controllerBalanceBeforeSwap = controllerInfo.lamports;

    let bobInfo = await swapper.provider.connection.getAccountInfo(bob.publicKey);
    let bobBalanceBeforeSwap = bobInfo.lamports;

    let escrow = await swapper.getEscrow(); 
    let escrowTokenBalanceBeforeSwap = await getSplBalance(swapper.provider, escrow.key);
    

    // Bob sell Move
    await swapper.sell_move(bob, bob_token_wallet, moveAmount);

    controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceAfterSwap = controllerInfo.lamports;

    bobInfo = await swapper.provider.connection.getAccountInfo(bob.publicKey);
    let bobBalanceAfterSwap = bobInfo.lamports;

    let escrowTokenBalanceAfterSwap = await getSplBalance(swapper.provider, escrow.key);


    // ASSERTION
    /**
     * Controller SOL balance should decrease by: 1 SOL (10^9 lamports)
     * Bob token wallet balance should decrease by: 10 MOVE (10 * 10^MOVE_DECIMAL) 
     * Bob Sol balance should increase by: 1 SOL (10^9 laports)
     * Escrow token balance should increase by 10 MOVE (10 * 10^MOVE_DECIMAL)
     */
    
    
    assert.ok(bobBalanceAfterSwap - bobBalanceBeforeSwap >= 0, "Bob Sol balance should be increase");
    assert.ok(controllerBalanceBeforeSwap- controllerBalanceAfterSwap == expectedReceiveAmount.toNumber(), "Controller Balance should decrease by an expected SOl");
    assert.ok(Number(escrowTokenBalanceAfterSwap) - Number(escrowTokenBalanceBeforeSwap) == moveAmount.toNumber(), "Escrow should increase 10 Move")
    
    let bobMoveBalance = await getSplBalance(swapper.provider, bob_token_wallet);
    assert.ok(Number(bobMoveBalance) == 0, "Bob token balance should be 0");
  })
  it("Remove", async()=>{
    let escrow = await swapper.getEscrow();
    const controller = await swapper.getController();
    let controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceBeforeSwap = controllerInfo.lamports;

    let deployerInfo = await swapper.provider.connection.getAccountInfo(deployer.publicKey);
    let deployerBalanceBefore = deployerInfo.lamports;
    
    let deployerTokenBalanceBefore = await getSplBalance(swapper.provider, deployer_token_wallet);
    let escrowTokenBalanceBefore = await getSplBalance(swapper.provider, escrow.key);


    // Deployer remove liquidity
    await swapper.remove(deployer, deployer_token_wallet, solAmount);

    let escrowTokenBalanceAfter = await getSplBalance(swapper.provider, escrow.key);

    let deployerTokenBalanceAfter = await getSplBalance(swapper.provider, deployer_token_wallet);

    controllerInfo = await swapper.provider.connection.getAccountInfo(controller.key);
    let controllerBalanceAfterSwap = controllerInfo.lamports;

    deployerInfo = await swapper.provider.connection.getAccountInfo(deployer.publicKey);
    let deployerBalanceAfter = deployerInfo.lamports;
     // ASSERTION
    /**
     * Controller SOL balance should decrease by: 1 SOL (10^9 lamports)
     * Escrow balance should decrease by: 10 MOVE (10 * 10^MOVE_DECIMAL) 
     * Deployer SOL balance should increase by: 1 SOL (10^9 lamports)
     */
    assert.ok(deployerBalanceAfter - deployerBalanceBefore > 0, "Deployer balance should be increase");
    assert.ok(controllerBalanceBeforeSwap - controllerBalanceAfterSwap == solAmount.toNumber(), "Controller Balance should increase by 1 SOL");
    
    let expectedTokenAmount = solAmount.mul(new anchor.BN(MOVE_PER_SOL)).mul(new anchor.BN(10).pow(new anchor.BN(MOVE_DECIMAL))).div(SOL_TO_LAMPORT)
    assert.ok(Number(escrowTokenBalanceBefore) - Number(escrowTokenBalanceAfter) == expectedTokenAmount.toNumber(),"Escrow Token balance should decrease by expected amount");
    assert.ok(Number(deployerTokenBalanceAfter) - Number(deployerTokenBalanceBefore) == expectedTokenAmount.toNumber(), "Deployer Token balance should increase by expected amount");
  })
  it("Alice cant add liquidity", async()=>{
    try{
      await swapper.deposit(alice, alice_token_wallet, solAmount);
    } catch(error) {
      assert.equal(error.error.errorMessage, 'A has one constraint was violated', "wrong error msg");
      return;
    }
    assert.fail("The instruction should fail since Alice is not the authorizer");
  })
  it("Alice cant remove liquidity", async()=>{
    try{
      await swapper.remove(alice, alice_token_wallet, solAmount);
    } catch(error) {
      assert.equal(error.error.errorMessage, 'A has one constraint was violated', "wrong error msg");
      return;
    }
    assert.fail("The instruction should fail since Alice is not the authorizer");
  })
});
