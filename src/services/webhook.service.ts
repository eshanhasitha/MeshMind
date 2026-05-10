import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Webhook,
  WebhookDelivery,
} from "../models/webhook.model";

let webhooks: Webhook[] = [];
let deliveries: WebhookDelivery[] = [];

export const getWebhooks = (): Webhook[] => webhooks;

export const getDeliveries = (): WebhookDelivery[] => deliveries;

export const addWebhook = (url: string): Webhook => {
  const webhook: Webhook = {
    webhook_id: `wh-${uuidv4()}`,
    url,
    created_at: new Date().toISOString(),
  };

  webhooks.push(webhook);

  return webhook;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isTransient = (status?: number) =>
  status === 500 ||
  status === 502 ||
  status === 503 ||
  status === 504;

export const sendWebhookEvent = async (
  event: string,
  payload: any
): Promise<void> => {
  const alertId = payload.alert_id;

  for (const webhook of webhooks) {
    const existingSuccess = deliveries.find(
      (delivery) =>
        delivery.webhook_url === webhook.url &&
        delivery.event === event &&
        delivery.alert_id === alertId &&
        delivery.status === "success"
    );

    if (existingSuccess) continue;

    const delivery: WebhookDelivery = {
      id: uuidv4(),
      webhook_url: webhook.url,
      event,
      alert_id: alertId,
      status: "pending",
      attempts: 0,
      delivered_at: null,
    };

    deliveries.push(delivery);

    while (delivery.status !== "success") {
      try {
        delivery.attempts += 1;

        await axios.post(webhook.url, payload, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000,
        });

        delivery.status = "success";
        delivery.delivered_at = new Date().toISOString();

        console.log(`[WEBHOOK] delivered ${event}`);
      } catch (error: any) {
        const status = error?.response?.status;

        if (isTransient(status)) {
          console.log(`[WEBHOOK] transient ${status}, retry ${delivery.attempts}`);
          await sleep(1000);
          continue;
        }

        delivery.status = "failed";
        console.log("[WEBHOOK] failed:", status || error?.message);
        break;
      }
    }
  }
};