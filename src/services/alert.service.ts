import { v4 as uuidv4 } from "uuid";

import { Alert } from "../models/alert.model";

import { getAllProxies } from "./proxy.service";

import {
  sendWebhookEvent,
} from "./webhook.service";

import {
  sendIntegrationEvent,
} from "./integration.service";

const getWebhooks = (): unknown[] => [];

let alerts: Alert[] = [];

const ALERT_THRESHOLD = 0.2;

let evaluating = false;

export const getAlerts = (): Alert[] => {
  return alerts;
};

export const getActiveAlert = (): Alert | undefined => {
  return alerts.find((alert) => alert.status === "active");
};

export const evaluateAlerts = async (): Promise<void> => {
  if (evaluating) {
    return;
  }

  evaluating = true;

  try {
    const proxies = getAllProxies();
    const total = proxies.length;
    const activeAlert = getActiveAlert();

    if (total === 0) {
      if (activeAlert) {
        activeAlert.status = "resolved";
        activeAlert.resolved_at = new Date().toISOString();

        await Promise.all([
          sendWebhookEvent("alert.resolved", {
            event: "alert.resolved",
            alert_id: activeAlert.alert_id,
            resolved_at: activeAlert.resolved_at,
          }),

          sendIntegrationEvent("alert.resolved", activeAlert),
        ]);
      }

      return;
    }

    const failed = proxies.filter((proxy) => proxy.status === "down");
    const failedCount = failed.length;
    const failureRate = Number((failedCount / total).toFixed(2));

    if (failureRate >= ALERT_THRESHOLD && !activeAlert) {
      const newAlert: Alert = {
        alert_id: uuidv4(),
        status: "active",
        failure_rate: failureRate,
        total_proxies: total,
        failed_proxies: failedCount,
        failed_proxy_ids: failed.map((proxy) => proxy.id),
        threshold: ALERT_THRESHOLD,
        fired_at: new Date().toISOString(),
        resolved_at: null,
        message: "Proxy pool failure rate exceeded threshold",
      };

      alerts.push(newAlert);

      await Promise.all([
        sendWebhookEvent("alert.fired", {
          event: "alert.fired",
          alert_id: newAlert.alert_id,
          fired_at: newAlert.fired_at,
          failure_rate: newAlert.failure_rate,
          total_proxies: newAlert.total_proxies,
          failed_proxies: newAlert.failed_proxies,
          failed_proxy_ids: newAlert.failed_proxy_ids,
          threshold: newAlert.threshold,
          message: newAlert.message,
        }),

        sendIntegrationEvent("alert.fired", newAlert),
      ]);

      console.log(`[ALERT] fired ${newAlert.alert_id}`);
      return;
    }

    if (failureRate >= ALERT_THRESHOLD && activeAlert) {
      activeAlert.failure_rate = failureRate;
      activeAlert.total_proxies = total;
      activeAlert.failed_proxies = failedCount;
      activeAlert.failed_proxy_ids = failed.map((proxy) => proxy.id);
      activeAlert.threshold = ALERT_THRESHOLD;
      activeAlert.message = "Proxy pool failure rate exceeded threshold";

      return;
    }

    if (failureRate < ALERT_THRESHOLD && activeAlert) {
      activeAlert.status = "resolved";
      activeAlert.resolved_at = new Date().toISOString();

      await Promise.all([
        sendWebhookEvent("alert.resolved", {
          event: "alert.resolved",
          alert_id: activeAlert.alert_id,
          resolved_at: activeAlert.resolved_at,
        }),

        sendIntegrationEvent("alert.resolved", activeAlert),
      ]);

      console.log(`[ALERT] resolved ${activeAlert.alert_id}`);
    }
  } finally {
    evaluating = false;
  }
};
