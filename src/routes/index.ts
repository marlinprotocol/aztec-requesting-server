import { Router } from "express";
import directProofRoute from "./directProof";
import welcomeRoute from "./welcome";

const router = Router();

router.use("/directProof", directProofRoute);
router.use("/welcome", welcomeRoute);

export default router;
