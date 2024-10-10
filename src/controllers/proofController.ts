import { Request, Response } from "express";
import { storeDataInMarlinDa } from "../services/marlinDaService";
import { requestProofDirectly } from "../services/proofServices";
import config from "../config.json";
import { getProofViaKalypso } from "../services/kalypsoService";
export const handleDirectProof = async (req: Request, res: Response) => {
  try {
    const { method, inputs } = req.body as { method: string; inputs: string };
    const payload = JSON.stringify({ method, inputs });
    const input_da_identifier = await storeDataInMarlinDa(payload);

    console.log("Stored data successfully with id", input_da_identifier);

    const proof_id = config.enableKalypso
      ? await getProofViaKalypso(input_da_identifier)
      : await requestProofDirectly(input_da_identifier);

    if (proof_id === "PROOF_NOT_FOUND") {
      console.warn("Proof not found");
      return res.status(400).json({ status: "Proof Not Found" });
    }

    return res.json({ proof_da_identifier: proof_id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong with the server");
  }
};
