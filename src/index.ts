import express from "express";
import routes from "./routes";
import { errorHandler } from "./utils/errorUtils";
import { initializeNonce } from "./services/kalypsoService";
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
app.listen(port, "0.0.0.0", async () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
  storeDataInMarlinDa("Test Data IN DA").then((uuid: string) => {
    console.log("Stored data in da with ID:", uuid);
  });
  if (config.enableKalypso) {
    initializeNonce().then(console.log);
  }
});

export default app;
