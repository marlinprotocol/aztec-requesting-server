import { Router } from "express";
import { handleDirectProof } from "../controllers/proofController";

const router = Router();

router.post("/", handleDirectProof);

export default router;
