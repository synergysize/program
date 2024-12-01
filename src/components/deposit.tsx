import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { program } from "../anchor/setup";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";


export default function Deposit() {
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setDepositAmount] = useState(0);

  const handleDepositAmount = (e: any) => {
    setDepositAmount(Number(e.target.value));
    console.log(Number(e.target.value));
  }
  const onClick = async () => {
    if (!publicKey) return;

    setIsLoading(true);

    try {
      const [globalState] = await PublicKey.findProgramAddress(
        [
          Buffer.from("GLOBAL_STATE_SEED")
        ],
        program.programId
      );

      const globalStateData = await program.account.globalState.fetch(globalState);
      const tokenMint = globalStateData.doubleToken;

      const [tokenVaultAccount, tokenVaultAccountBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("TOKEN_VAULT_SEED"),
          tokenMint.toBuffer()
        ],
        program.programId
      );
     
      const tokenAmount = amount * 10 ** 6; // decimal 6
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey
      );
      let receiver = null;
      let receiverTokenAccount = null;

      const records = globalStateData.records;
      if(records.length > 0) {
        const contractAmount = Number(globalStateData.tokenAmount) + tokenAmount;
        if(contractAmount > tokenAmount * 2) {
          receiver = records[0].address;
          receiverTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            receiver
          );
        } else {
          receiver = publicKey;
          receiverTokenAccount = userTokenAccount;
        }
      } else {
        receiver = publicKey;
        receiverTokenAccount = userTokenAccount;
      }

      const transaction = await program.methods
      .deposit(new BN(tokenAmount))
      .accounts({
        user: publicKey,
        globalState,
        receiver,
        tokenMint,
        tokenAccount: userTokenAccount,
        receiverTokenAccount,
        tokenVaultAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction(); 
    
      const transactionSignature = await sendTransaction(
        transaction,
        connection
      );

      console.log(`View on explorer: https://solana.fm/tx/${transactionSignature}?cluster=devnet-alpha`);

    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{marginBottom:"10px"}}>
      <input type="number" min={0} onChange={(e) => handleDepositAmount(e)}/>
      <button
        className="w-24"
        onClick={onClick}
        disabled={!publicKey}
      >
        {isLoading ? "Loading" : "Deposit"}
      </button>
    </div>
  );
}
