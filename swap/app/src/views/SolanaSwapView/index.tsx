
import { FC, useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";


import { SelectAndConnectWalletButton } from "components";
import * as anchor from "@project-serum/anchor";

import { SolanaLogo } from "components";
import styles from "./index.module.css";
import { buy_move, sell_move } from "./swap";
import { useProgram } from "./useProgram";

const endpoint = "https://explorer-api.devnet.solana.com";

const connection = new anchor.web3.Connection(endpoint);

export const SolanaSwapView: FC = ({ }) => {
  const wallet = useAnchorWallet();


  return (
    <div className="container mx-auto max-w-6xl p-8 2xl:px-0">
      <div className={styles.container}>
        <div className="navbar mb-2   text-neutral-content rounded-box">
          <div className="flex-none">
            <button className="btn btn-square btn-ghost">
              <span className="text-4xl">🌝</span>
            </button>
          </div>
          <div className="flex-1 px-2 mx-2">
            <div className="text-sm breadcrumbs">
              <ul className="text-xl">
              </ul>
            </div>
          </div>

          <div className="flex-none">
            <WalletMultiButton className="btn btn-ghost" />
          </div>
        </div>

        <div className="text-center pt-2">
          <div className="hero min-h-16 pt-4">
            <div className="text-center hero-content">
              <div className="max-w-[800px]">
                <h1 className="mb-5 text-5xl">
                  Swap between SOL and MOVE <SolanaLogo />
                </h1>

                <p>1 SOL = 10 MOVE</p>
              </div>
            </div>
          </div>
        </div>



        <div className="flex justify-center">
          {!wallet ? (
            <SelectAndConnectWalletButton onUseWalletClick={() => { }} />
          ) : (
            <SwapScreen />
          )}
        </div>
      </div>
    </div>
  );
};

const SwapScreen = () => {
  const wallet: any = useAnchorWallet();
  const [swaps, setSwaps] = useState<unknown[]>([]);
  const { program } = useProgram({ connection, wallet });
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>();
  

  useEffect(() => {
  }, [wallet, lastUpdatedTime]);




  const onSwapSent = (swapEvent: unknown) => {
    setSwaps((prevState) => ({
      ...prevState,
      swapEvent,
    }));
  };

  return (
    <div className="rounded-lg flex justify-center">

      <div className="flex flex-col items-center justify-center">
        <div className="text-xs">
          <NetSwap onSwapSent={onSwapSent} />

        </div>

      </div>
    </div>
  );
};

type NetSwap = {
  onSwapSent: (t: any) => void;
};

const NetSwap: FC<NetSwap> = ({ onSwapSent }) => {
  const wallet: any = useAnchorWallet();
  const { program } = useProgram({ connection, wallet });
  const [isBuyMove, setIsBuyMove] = useState(true);
  const [amount, setAmount] = useState<any>(0)
  const [swapAmount, setSwapAmount] = useState<any>(0);
  // const [value, setValue] = useState<any>(0)
  // const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   const { value } = e.target;
  //   if (value) {
  //     setContent(value);
  //   }
  // };

  const onSwapClick = async () => {
    if (!program) return;

    // const amount = new anchor.BN(Number(value) * (10**9));
    let value;
    let result
    if (isBuyMove) {
      value = new anchor.BN(Number(amount) * (10**9));
      result = await buy_move({
        program,
        wallet,
        amount: value
      })
    } else {
      value = new anchor.BN(Number(amount) * (10**6));
      result = await sell_move({
        program,
        wallet,
        amount: value
      })
    }



    console.log("New swap transaction succeeded: ", result);
    setSwapAmount("");
    setAmount("")
    onSwapSent(result);
  };
  const onChangeClick = () => {
    setIsBuyMove(!isBuyMove);
    setSwapAmount("");
    setAmount("")
  }
  // console.log(value)
  function isNumeric(value:any) {
    return /^[0-9]{0,9}(\.[0-9]{1,2})?$/.test(value);
  }

  return (
    <div style={{ minWidth: 240 }} className="mb-8 pb-4 border-b border-gray-500 flex ">

      <div className="w-full flex flex-col items-center ">
        <input value={amount==0?"":amount} onChange={(e) => {
          const value = e.target.value 
          console.log(value)
          setAmount(value)
          if (isBuyMove) {
            setSwapAmount(Number(value)*10)
          } else {
            setSwapAmount(Number(value)/10)
          }
        }
        } placeholder= {isBuyMove?"Enter the SOL amount":"Enter the MOVE amount"} className="mb-4"></input>
        
        <button
          className="btn btn-primary rounded-full normal-case"
          onClick={onChangeClick}
          style={{ minHeight: 0 ,marginBottom: 15, fontSize:20}}
        >
          ↓
        </button>
        <input value={amount==0?"":swapAmount} disabled={true}
        placeholder={isBuyMove?"MOVE amount":"SOL amount"} className="mb-4"></input>
        <button
          className="btn btn-primary rounded-full normal-case	w-full"
          onClick={onSwapClick}
          style={{ minHeight: 0, height: 40 }}
        >
          Swap
        </button>
      </div>
    </div>
  );
};
