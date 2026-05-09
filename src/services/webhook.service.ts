import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Webhook,
  WebhookDelivery,
} from "../models/webhook.model";

let webhooks: Webhook[] = [];
let deliveries: WebhookDelivery[] = [];

export const getWebhooks = (): Webhook[] => {
  return webhooks;
};

export const getDeliveries = (): WebhookDelivery[] => {
  return deliveries;
};

export const addWebhook = (url: string): Webhook => {
  const webhook: Webhook = {
    id: uuidv4(),
    url,
    created_at: new Date().toISOString(),
  };

  webhooks.push(webhook);

  return webhook;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const sendWebhookEvent = async (
  event: string,
  payload: any
): Promise<void> => {
  const alertId = payload.alert_id;

  for (const webhook of webhooks) {
    const existingSuccess = deliveries.find(
      (delivery: any) =>
        delivery.webhook_url === webhook.url &&
        delivery.event === event &&
        delivery.alert_id === alertId &&
        delivery.status === "success"
    );

    if (existingSuccess) {
      continue;
    }

    const delivery: any = {
      id: uuidv4(),
      webhook_url: webhook.url,
      event,
      alert_id: alertId,
      status: "pending",
      attempts: 0,
      delivered_at: null,
    };

    deliveries.push(delivery);

    while (
      delivery.status !== "success" &&
      delivery.attempts < 10
    ) {
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

        console.log(`📨 Webhook delivered: ${event}`);
      } catch (error: any) {
        const status = error?.response?.status;

        if ([500, 502, 503, 504].includes(status)) {
          console.log(
            `🔁 Webhook retry ${status}, attempt ${delivery.attempts}`
          );

          await sleep(2000);
          continue;
        }

        delivery.status = "failed";

        console.log(
          "❌ Webhook failed:",
          status || error?.message
        );

        break;
      }
    }

    if (delivery.status !== "success") {
      delivery.status = "failed";
      console.log("❌ Webhook max retries exceeded");
    }
  }
};