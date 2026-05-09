import { Request, Response } from "express";

import { getAllProxies } from "../services/proxy.service";

import { getAlerts } from "../services/alert.service";

import { getDeliveries } from "../services/webhook.service";

export const getMetrics = (
  req: Request,
  res: Response
) => {

  try {

    const proxies =
      getAllProxies();

    const alerts =
      getAlerts();

    const deliveries =
      getDeliveries();

    /*
     Total checks
    */
    const totalChecks =
      proxies.reduce(
        (sum, proxy) =>
          sum +
          proxy.total_checks,
        0
      );

    /*
     Active alerts
    */
    const activeAlerts =
      alerts.filter(
        (alert) =>
          alert.status ===
          "active"
      ).length;

    return res
      .status(200)
      .json({

        total_checks:
          totalChecks,

        current_pool_size:
          proxies.length,

        active_alerts:
          activeAlerts,

        total_alerts:
          alerts.length,

        webhook_deliveries:
          deliveries.length,
      });

  } catch (error) {

    return res
      .status(500)
      .json({
        message:
          "Internal server error",
      });
  }
};