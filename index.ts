console.log("starting aztec request placing server");
import express, { Request, Response } from "express";
import { KalypsoSdk } from "kalypso-sdk";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";

import * as keys from "./keys.json";
import * as kalypsoConfig from "./kalypso-chain.json";
import * as requestData from "./requestData.json";

const port = 9001;
const app: express.Application = express();
app.use(express.json({ limit: "10mb" }));

const provider = new ethers.JsonRpcProvider(keys.rpc);
const wallet = new ethers.Wallet(keys.requestor_gas_key, provider);
const kalypso = new KalypsoSdk(wallet as any, kalypsoConfig);

const reward = new BigNumber(10).pow(18).multipliedBy(145).div(10).toFixed(0);
const assignmentDeadline = new BigNumber(0).plus(100000000000000);
const proofGenerationTimeInBlocks = new BigNumber(0).plus(100000000000000);

const abicoder = new ethers.AbiCoder();

storeDataInMarlinDa("Test Payload").then(function (uuid) {
  console.log("Stored Test data successfully with id", uuid);
});

let globalNonce: number;
app.post("/directProof", async (req: Request, res: Response) => {
  try {
    const { method, inputs } = req.body as {
      method: string;
      inputs: string;
    };
    const payload = JSON.stringify({ method, inputs });
    const input_da_identifier = await storeDataInMarlinDa(payload);
    console.log("************************");
    console.warn("input_id", input_da_identifier);
    console.warn("payload size", inputs.length);
    console.log("************************");

    // let proof_id = await get_proof_via_kalypso(input_da_identifier);
    let proof_id = await requestProof_directly(input_da_identifier);

    console.log("#########################################");
    console.warn("input_id", input_da_identifier, "proof_id", proof_id);
    console.log("#########################################");

    if (proof_id === "PROOF_NOT_FOUND") {
      console.warn("Proof not found");
      return res.status(400).json({ status: "Proof Not Found" });
    }

    return res.json({ proof_da_identifier: proof_id });
  } catch (error) {
    console.error(error);
    res.status(501).send("Something wrong with server");
  }
});

async function get_proof_via_kalypso(
  input_da_identifier: string,
): Promise<string> {
  const encoded = abicoder.encode(["string"], [input_da_identifier]);

  const askRequest = await kalypso.MarketPlace().createAsk(
    requestData.marketId,
    encoded,
    reward,
    assignmentDeadline.toFixed(0),
    proofGenerationTimeInBlocks.toFixed(0),
    await wallet.getAddress(),
    0, // TODO: keep this 0 for now
    Buffer.from(""),
    false,
    { nonce: globalNonce++ },
  );
  const tx = await askRequest.wait();
  const askId = await kalypso.MarketPlace().getAskId(tx!);

  // fix timeouts and all cases here
  const proof_id = await getProofWithRetry(askId, tx!.blockNumber);
  return proof_id;
}
app.get("/welcome", (req: Request, res: Response) => {
  res.send("Welcome to Aztec Requesting Service - GET!");
});

app.post("/welcome", (req: Request, res: Response) => {
  res.send("Welcome to Aztec Requesting Service - POST!");
});

app.listen(port, "0.0.0.0", () => {
  console.warn(`Server is running on http://0.0.0.0:${port}`);
});

// kalypso
//   .MarketPlace()
//   .approvePaymentTokenToMarketPlace("10000000000000000000000000000000000")
//   .then((tx) => {
//     tx.wait(40).then(() => {
//       app.listen(port, "0.0.0.0", () => {
//         console.warn(`Server is running on http://0.0.0.0:${port}`);
//         wallet.getAddress().then((address) => {
//           console.log("Using address: ", address);
//           provider.getTransactionCount(address).then((count) => {
//             console.log("transaction count", count);
//             globalNonce = count;
//           });
//         });
//         wallet.getNonce().then((nonce) => {
//           console.log("Wallet nonce:", nonce);
//         });
//       });
//     });
//   });

async function storeDataInMarlinDa(payload: string): Promise<string> {
  const response = await fetch("http://88.198.12.137:8080/store", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData: { id: string } = await response.json();
  return responseData.id;
}

async function requestProof_directly(
  input_da_identifier: string,
): Promise<string> {
  const id_da_uint8_array = Array.from(
    new Uint8Array(Buffer.from(input_da_identifier)),
  );
  const response = await fetch(
    "http://3.110.126.236:7777/api/getProof",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public: id_da_uint8_array }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const responseData: { proof: Uint8Array } = await response.json();
  return convertToId(responseData.proof);
}

function convertToId(publicUint8Array: Uint8Array): string {
  const decodedString = Buffer.from(publicUint8Array).toString();
  return decodedString;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getProofWithRetry(
  askId: string,
  startBlock: number,
  retryInterval = 1000,
): Promise<string> {
  const maxRetires = 1200;
  let retries = 0;
  while (true) {
    if (retries == maxRetires) {
      return "PROOF_NOT_FOUND";
    }
    try {
      console.log("Trying to fetch proof for ask", askId, new Date());
      const proof = await kalypso
        .MarketPlace()
        .getProofByAskId(askId, startBlock);
      if (proof && proof.proof_generated) {
        const proof_id_bytes = proof.proof;
        const hexString = proof_id_bytes.toString().startsWith("0x")
          ? proof_id_bytes.slice(2).toString()
          : proof_id_bytes.toString();
        const proof_id = Buffer.from(hexString, "hex").toString("utf-8");
        return proof_id;
      }
    } catch (error) {
      console.error("Error fetching proof:", error);
    }

    // Sleep before retrying
    await sleep(retryInterval);
    retries++;
  }
}
