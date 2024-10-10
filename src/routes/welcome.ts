import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Aztec Requesting Service - GET!");
});

router.post("/", (req: Request, res: Response) => {
  res.send("Welcome to Aztec Requesting Service - POST!");
});

export default router;
