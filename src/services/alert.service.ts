import { v4 as uuidv4 } from "uuid";

import { Alert } from "../models/alert.model";

import { getAllProxies } from "./proxy.service";
import { sendWebhookEvent } from "./webhook.service";
import { sendIntegrationEvent } from "./integration.service";

let alerts: Alert[] = [];

const ALERT_THRESHOLD = 0.2;

let evaluating = false;

const firedWebhookSent = new Set<string>();
const resolvedWebhookSent = new Set<string>();

export const getAlerts = (): Alert[] => {
  return alerts;
};

export const getActiveAlert = (): Alert | undefined => {
  return alerts.find((alert) => alert.status === "active");
};

const buildFiredPayload = (alert: Alert) => {
  return {
    event: "alert.fired",
    alert_id: alert.alert_id,
    fired_at: alert.fired_at,
    failure_rate: alert.failure_rate,
    total_proxies: alert.total_proxies,
    failed_proxies: alert.failed_proxies,
    failed_proxy_ids: alert.failed_proxy_ids,
    threshold: alert.threshold,
    message: alert.message,
  };
};

const buildResolvedPayload = (alert: Alert) => {
  return {
    event: "alert.resolved",
    alert_id: alert.alert_id,
    resolved_at: alert.resolved_at,
  };
};

const syncActiveAlertState = (
  alert: Alert,
  failureRate: number,
  total: number,
  failedCount: number,
  failedProxyIds: string[]
): void => {
  alert.failure_rate = failureRate;
  alert.total_proxies = total;
  alert.failed_proxies = failedCount;
  alert.failed_proxy_ids = failedProxyIds;
  alert.threshold = ALERT_THRESHOLD;
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
      if (
        activeAlert &&
        !resolvedWebhookSent.has(activeAlert.alert_id)
      ) {
        activeAlert.status = "resolved";
        activeAlert.resolved_at = new Date().toISOString();

        resolvedWebhookSent.add(activeAlert.alert_id);

        await sendWebhookEvent(
          "alert.resolved",
          buildResolvedPayload(activeAlert)
        );

        await sendIntegrationEvent(
          "alert.resolved",
          activeAlert
        );
      }

      return;
    }

    const failed = proxies.filter(
      (proxy) => proxy.status === "down"
    );

    const failedCount = failed.length;

    const failureRate = Number(
      (failedCount / total).toFixed(2)
    );

    const failedProxyIds = failed.map(
      (proxy) => proxy.id
    );

    /*
     Persistent breach:
     keep SAME active alert.
     Do NOT send duplicate alert.fired webhook.
    */
    if (
      failureRate >= ALERT_THRESHOLD &&
      activeAlert
    ) {
      /*
       Keep active alert snapshot consistent with current breach state.
      */
      syncActiveAlertState(
        activeAlert,
        failureRate,
        total,
        failedCount,
        failedProxyIds
      );

      return;
    }

    /*
     New breach:
     create exactly one active alert.
    */
    if (
      failureRate >= ALERT_THRESHOLD &&
      !activeAlert
    ) {
      const newAlert: Alert = {
        alert_id: `alert-${uuidv4()}`,
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

      if (!firedWebhookSent.has(newAlert.alert_id)) {
        firedWebhookSent.add(newAlert.alert_id);

        await sendWebhookEvent(
          "alert.fired",
          buildFiredPayload(newAlert)
        );

        await sendIntegrationEvent(
          "alert.fired",
          newAlert
        );
      }

      return;
    }

    /*
     Recovery:
     resolve active alert once.
    */
    if (
      failureRate < ALERT_THRESHOLD &&
      activeAlert
    ) {
      activeAlert.status = "resolved";
      activeAlert.resolved_at = new Date().toISOString();

      if (!resolvedWebhookSent.has(activeAlert.alert_id)) {
        resolvedWebhookSent.add(activeAlert.alert_id);

        await sendWebhookEvent(
          "alert.resolved",
          buildResolvedPayload(activeAlert)
        );

        await sendIntegrationEvent(
          "alert.resolved",
          activeAlert
        );
      }
    }
  } finally {
    evaluating = false;
  }
};
