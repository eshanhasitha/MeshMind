import { v4 as uuidv4 } from "uuid";

import { Alert } from "../models/alert.model";

import { getAllProxies } from "./proxy.service";
import { sendWebhookEvent } from "./webhook.service";
import { sendIntegrationEvent } from "./integration.service";

/*
 Alert storage
*/
let alerts: Alert[] = [];

/*
 Threshold
*/
const ALERT_THRESHOLD = 0.2;

/*
 Get all alerts
*/
export const getAlerts =
  (): Alert[] => {
    return alerts;
  };

/*
 Get active alert
*/
export const getActiveAlert =
  (): Alert | undefined => {

    return alerts.find(
      (alert) =>
        alert.status === "active"
    );
  };

/*
 Evaluate alert state
*/
export const evaluateAlerts =
  (): void => {

    const proxies =
      getAllProxies();

    const total =
      proxies.length;

    /*
     Avoid division by zero
    */
    if (total === 0) {
      return;
    }

    const failed =
      proxies.filter(
        (proxy) =>
          proxy.status === "down"
      );

    const failedCount =
      failed.length;

    const failureRate =
      failedCount / total;

    const activeAlert =
      getActiveAlert();

    /*
     FIRE ALERT
    */
    if (
      failureRate >=
        ALERT_THRESHOLD &&
      !activeAlert
    ) {

      const newAlert: Alert =
        {
          alert_id:
            uuidv4(),

          status: "active",

          failure_rate:
            Number(
              failureRate.toFixed(
                2
              )
            ),

          total_proxies:
            total,

          failed_proxies:
            failedCount,

          failed_proxy_ids:
            failed.map(
              (proxy) =>
                proxy.id
            ),

          threshold_value:
            ALERT_THRESHOLD,

          fired_at:
            new Date().toISOString(),

          resolved_at: null,

          message:
            `Failure threshold exceeded (${failedCount}/${total} proxies down)`,
        };

      alerts.push(
        newAlert
      );
    /*
    Send webhook
    */
    sendWebhookEvent(
    "alert.fired",
    {
        event: "alert.fired",

        alert: newAlert,
        
    }
    
    
),sendIntegrationEvent("alert.fired", newAlert);;

      console.log(
        `🚨 ALERT FIRED: ${newAlert.alert_id}`
      );
    }

    /*
     RESOLVE ALERT
    */
    if (
      failureRate <
        ALERT_THRESHOLD &&
      activeAlert
    ) {

      activeAlert.status =
        "resolved";

      activeAlert.resolved_at =
        new Date().toISOString();

    /*
    Send webhook
    */
    sendWebhookEvent(
    "alert.resolved",
    {
        event:
        "alert.resolved",

        alert:
        activeAlert,
    }
    ),sendIntegrationEvent("alert.resolved", activeAlert);

      console.log(
        `✅ ALERT RESOLVED: ${activeAlert.alert_id}`
      );
    }
  };