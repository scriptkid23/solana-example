import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";

import data from "./solana-dapp.json";
import {SolanaSwap,IDL} from "./solana_swap"


export interface Wallet {
  signTransaction(
    tx: anchor.web3.Transaction
  ): Promise<anchor.web3.Transaction>;
  signAllTransactions(
    txs: anchor.web3.Transaction[]
  ): Promise<anchor.web3.Transaction[]>;
  publicKey: anchor.web3.PublicKey;
}

type ProgramProps = {
  connection: Connection;
  wallet: Wallet;
};

export const useProgram = ({ connection, wallet }: ProgramProps) => {
  const [program, setProgram] = useState<anchor.Program<SolanaSwap>>();

  useEffect(() => {
    updateProgram();
    console.log(program)
  }, [connection, wallet]);

  const updateProgram = () => {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: "recent",
      commitment: "processed",
    });
    console.log("provider", provider);
    const idl = IDL;

    //   const idl = await anchor.Program.fetchIdl(programID, provider);
    //   console.log("idl", idl);

    const programID = new PublicKey(data.metadata.address);
    const program  = new anchor.Program(idl, programID, provider);
    setProgram(program);
  };

  return {
    program,
  };
};
