import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import configRoutes from "./routes/config.routes";
import proxyRoutes from "./routes/proxy.routes";
import { startMonitoringScheduler } from "./scheduler/monitor.scheduler";
import alertRoutes from "./routes/alert.routes";
import webhookRoutes from "./routes/webhook.routes";
import integrationRoutes from "./routes/integration.routes";
import metricsRoutes from "./routes/metrics.routes";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 3000;

/*
 Middleware
*/
app.use(cors());
app.use(express.json());

/*
 Health
*/
app.get(
  "/health",
  (req, res) => {
    return res
      .status(200)
      .json({
        status: "ok",
      });
  }
);

/*
 Config Routes
*/
app.use(
  "/config",
  configRoutes
);

/*
 Proxy Routes
*/
app.use(
  "/proxies",
  proxyRoutes
);

/*
 Start monitoring system
*/
startMonitoringScheduler();

/*
 Alert Routes
*/
app.use(
  "/alerts",
  alertRoutes
);

app.use(
  "/webhooks",
  webhookRoutes
);

app.use("/integrations", integrationRoutes);

app.use(
  "/metrics",
  metricsRoutes
);
/*
 Start Server
*/
app.listen(PORT, () => {
  console.log(
    `🚀 ProxyMaze running on port ${PORT}`
  );
});