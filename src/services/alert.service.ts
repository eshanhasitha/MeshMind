import { v4 as uuidv4 } from "uuid";

import { Alert } from "../models/alert.model";

import { getAllProxies } from "./proxy.service";
import { sendWebhookEvent } from "./webhook.service";
import { sendIntegrationEvent } from "./integration.service";

let alerts: Alert[] = [];

const ALERT_THRESHOLD = 0.2;

let evaluating = false;

export const getAlerts = (): Alert[] => {
  return alerts;
};

export const getActiveAlert = (): Alert | undefined => {
  return alerts.find((alert) => alert.status === "active");
};

const firedEvents = new Set<string>();
const resolvedEvents = new Set<string>();

const firedPayload = (alert: Alert) => ({
  event: "alert.fired",
  alert_id: alert.alert_id,
  fired_at: alert.fired_at,
  failure_rate: alert.failure_rate,
  total_proxies: alert.total_proxies,
  failed_proxies: alert.failed_proxies,
  failed_proxy_ids: alert.failed_proxy_ids,
  threshold: alert.threshold,
  message: alert.message,
});

const resolvedPayload = (alert: Alert) => ({
  event: "alert.resolved",
  alert_id: alert.alert_id,
  resolved_at: alert.resolved_at,
});

export const evaluateAlerts = async (): Promise<void> => {
  if (evaluating) return;

  evaluating = true;

  try {
    const proxies = getAllProxies();
    const total = proxies.length;
    const activeAlert = getActiveAlert();

    if (total === 0) {
      if (activeAlert && !resolvedEvents.has(activeAlert.alert_id)) {
        activeAlert.status = "resolved";
        activeAlert.resolved_at = new Date().toISOString();

        resolvedEvents.add(activeAlert.alert_id);

        await sendWebhookEvent("alert.resolved", resolvedPayload(activeAlert));
        await sendIntegrationEvent("alert.resolved", activeAlert);
      }

      return;
    }

    const failed = proxies.filter((proxy) => proxy.status === "down");
    const failedCount = failed.length;
    const failureRate = Number((failedCount / total).toFixed(2));
    const failedProxyIds = failed.map((proxy) => proxy.id);

    if (failureRate >= ALERT_THRESHOLD && activeAlert) {
      activeAlert.failure_rate = failureRate;
      activeAlert.total_proxies = total;
      activeAlert.failed_proxies = failedCount;
      activeAlert.failed_proxy_ids = failedProxyIds;
      activeAlert.threshold = ALERT_THRESHOLD;
      activeAlert.message = "Proxy pool failure rate exceeded threshold";

      return;
    }

    if (failureRate >= ALERT_THRESHOLD && !activeAlert) {
      const newAlert: Alert = {
        alert_id: uuidv4(),
        status: "active",
        failure_rate: failureRate,
        total_proxies: total,
        failed_proxies: failedCount,
        failed_proxy_ids: failedProxyIds,
        threshold: ALERT_THRESHOLD,
        fired_at: new Date().toISOString(),
        resolved_at: null,
        message: "Proxy pool failure rate exceeded threshold",
      };

      alerts.push(newAlert);

      if (!firedEvents.has(newAlert.alert_id)) {
        firedEvents.add(newAlert.alert_id);

        await sendWebhookEvent("alert.fired", firedPayload(newAlert));
        await sendIntegrationEvent("alert.fired", newAlert);
      }

      return;
    }

    if (failureRate < ALERT_THRESHOLD && activeAlert) {
      activeAlert.status = "resolved";
      activeAlert.resolved_at = new Date().toISOString();

      if (!resolvedEvents.has(activeAlert.alert_id)) {
        resolvedEvents.add(activeAlert.alert_id);

        await sendWebhookEvent("alert.resolved", resolvedPayload(activeAlert));
        await sendIntegrationEvent("alert.resolved", activeAlert);
      }
    }
  } finally {
    evaluating = false;
  }
};