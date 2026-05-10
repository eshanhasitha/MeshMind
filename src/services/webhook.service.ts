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

const postJson = async (
  url: string,
  payload: any
) => {
  return axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ProxyMaze/1.0",
    },
    timeout: 10000,

    /*
     Important:
     Do not auto-follow redirect as GET.
     We handle status ourselves.
    */
    maxRedirects: 0,

    validateStatus: () => true,
  });
};

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

    if (existingSuccess) {
      continue;
    }

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

        let response = await postJson(
          webhook.url,
          payload
        );

        /*
         If evaluator redirects HTTP, repost to Location
         using POST again, not GET.
        */
        if (
          [301, 302, 307, 308].includes(response.status) &&
          response.headers.location
        ) {
          response = await postJson(
            response.headers.location,
            payload
          );
        }

        if (
          response.status >= 200 &&
          response.status < 300
        ) {
          delivery.status = "success";
          delivery.delivered_at =
            new Date().toISOString();

          console.log(`[WEBHOOK] delivered ${event}`);
          break;
        }

        if (isTransient(response.status)) {
          console.log(
            `[WEBHOOK] transient ${response.status}, retry ${delivery.attempts}`
          );

          await sleep(1000);
          continue;
        }

        delivery.status = "failed";

        console.log(
          "[WEBHOOK] failed:",
          response.status
        );

        break;
      } catch (error: any) {
        delivery.status = "failed";

        console.log(
          "[WEBHOOK] failed:",
          error?.message
        );

        break;
      }
    }
  }
};