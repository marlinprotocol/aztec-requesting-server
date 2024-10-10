import express from "express";
import routes from "./routes";
import { errorHandler } from "./utils/errorUtils";
import {
  getAskIdFromTxHash,
  initializeNonce,
  setInfiniteApproval,
} from "./services/kalypsoService";
import config from "./config.json";
import { storeDataInMarlinDa } from "./services/marlinDaService";

const app = express();
const port = config.port || 9001;

app.use(express.json({ limit: "10mb" }));

// Initialize routes
app.use("/", routes);

// Error handling middleware
app.use(errorHandler);

// Start server

function startServer() {
  storeDataInMarlinDa("Test Data IN DA").then((uuid: string) => {
    console.log("Stored data in da with ID:", uuid);
    app.listen(port, "0.0.0.0", async () => {
      console.log(`Server is running on http://0.0.0.0:${port}`);
    });
  });
}

if (config.kalypsoConfig) {
  initializeNonce().then(console.log);
  setInfiniteApproval().then((hash) => {
    console.log("set infinite approval");
    console.log(hash);
    startServer();
  });
} else {
  startServer();
}

getAskIdFromTxHash(
  "0xa052a3a0071d5c584098baced7e8cfc944857ec3ecaeb6e18634965f1753e770",
).then(console.log);

export default app;
