import { KalypsoSdk } from "kalypso-sdk";
import { ethers } from "ethers";
import config from "../config.json";
import BigNumber from "bignumber.js";
import { sleep } from "../utils/sleep";
import { Semaphore } from "async-mutex";

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.requestorGasKey, provider);
const kalypso = new KalypsoSdk(wallet, config.kalypsoConfig);

const reward = new BigNumber(config.reward);
const assignmentDeadline = new BigNumber(config.assignmentDeadline);
const proofGenerationTimeInBlocks = new BigNumber(
  config.proofGenerationTimeInBlocks,
);

const transactionSemaphore = new Semaphore(1);

let globalNonce: number;

export async function initializeNonce(): Promise<string> {
  const address = await wallet.getAddress();
  let nonce = await provider.getTransactionCount(address);
  globalNonce = nonce;
  return "Initialized global nonce:" + globalNonce;
}

export async function setInfiniteApproval(): Promise<string> {
  const tx = await kalypso
    .MarketPlace()
    .approvePaymentTokenToMarketPlace("999999999999999999999999999999999999");
  const receipt = await tx.wait(config.onchainConfirmation);
  return receipt!.hash;
}

export async function getProofViaKalypso(
  input_da_identifier: string,
): Promise<string> {
  await transactionSemaphore.acquire();
  try {
    const encodedInput = Buffer.from(input_da_identifier);

    const askRequest = await kalypso.MarketPlace().createAsk(
      config.kalypsoMarketId,
      encodedInput,
      reward.toFixed(0),
      assignmentDeadline.toFixed(0),
      proofGenerationTimeInBlocks.toFixed(0),
      await wallet.getAddress(),
      0, // Keep this 0 for now
      Buffer.from(""),
      false,
    );
    transactionSemaphore.release();

    const tx = await askRequest.wait(config.onchainConfirmation);
    const askId = await kalypso.MarketPlace().getAskId(tx!);

    return await getProofWithRetry(askId, tx!.blockNumber);
  } catch (error) {
    transactionSemaphore.release();
    throw error;
  }
}

export async function getAskIdFromTxHash(hash: string): Promise<string> {
  const receipt = await provider.getTransactionReceipt(hash);
  const askId = await kalypso.MarketPlace().getAskId(receipt!);
  console.log("Ask ID:", askId);
  return "Done";
}

async function getProofWithRetry(
  askId: string,
  startBlock: number,
  retryInterval = config.retryInterval,
  maxRetries = config.maxRetries,
): Promise<string> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      console.log("Trying to fetch proof for ask", askId, new Date());
      const proof = await kalypso
        .MarketPlace()
        .getProofByAskId(askId, startBlock);
      if (proof && proof.proof_generated) {
        const proofIdBytes = proof.proof;
        const hexString = proofIdBytes.toString().startsWith("0x")
          ? proofIdBytes.slice(2)
          : proofIdBytes;
        const proofId = Buffer.from(hexString as any, "hex").toString("utf-8");
        return proofId;
      }
    } catch (error) {
      console.error("Error fetching proof:", error);
    }

    await sleep(retryInterval);
    retries++;
  }
  return "PROOF_NOT_FOUND";
}
