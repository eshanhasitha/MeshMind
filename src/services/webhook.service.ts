import axios from "axios";

import { v4 as uuidv4 } from "uuid";

import {
  Webhook,
  WebhookDelivery,
} from "../models/webhook.model";

/*
 Storage
*/
let webhooks: Webhook[] = [];

let deliveries:
  WebhookDelivery[] = [];

/*
 Get webhooks
*/
export const getWebhooks =
  (): Webhook[] => {
    return webhooks;
  };

/*
 Get deliveries
*/
export const getDeliveries =
  (): WebhookDelivery[] => {
    return deliveries;
  };

/*
 Add webhook
*/
export const addWebhook = (
  url: string
): Webhook => {

  const webhook: Webhook = {
    id: uuidv4(),

    url,

    created_at:
      new Date().toISOString(),
  };

  webhooks.push(webhook);

  return webhook;
};

/*
 Retryable statuses
*/
const retryableStatuses = [
  500,
  502,
  503,
  504,
];

/*
 Send webhook event
*/
export const sendWebhookEvent =
  async (
    event: string,
    payload: any
  ): Promise<void> => {

    for (const webhook of webhooks) {

      /*
       Prevent duplicate success
      */
      const existing =
        deliveries.find(
          (delivery) =>
            delivery.webhook_url ===
              webhook.url &&
            delivery.event ===
              event &&
            delivery.status ===
              "success"
        );

      if (existing) {
        continue;
      }

      const delivery:
        WebhookDelivery = {
          id: uuidv4(),

          webhook_url:
            webhook.url,

          event,

          status: "pending",

          attempts: 0,

          delivered_at: null,
        };

      deliveries.push(
        delivery
      );

      let delivered = false;

      /*
       Retry until success
      */
      while (!delivered) {

        try {

          delivery.attempts += 1;

          const response =
            await axios.post(
              webhook.url,
              payload
            );

          /*
           Success
          */
          if (
            response.status >=
              200 &&
            response.status < 300
          ) {

            delivery.status =
              "success";

            delivery.delivered_at =
              new Date().toISOString();

            delivered = true;

            console.log(
              `📨 Webhook delivered -> ${webhook.url}`
            );

            break;
          }

          /*
           Retryable
          */
          if (
            retryableStatuses.includes(
              response.status
            )
          ) {

            console.log(
              `🔁 Retrying webhook...`
            );

            continue;
          }

          /*
           Permanent failure
          */
          delivery.status =
            "failed";

          delivered = true;

        } catch (error: any) {
          delivery.status = "failed";

          console.log(
            "❌ Webhook failed:",
            error?.response?.status || error?.message
          );

          delivered = true;
        }
      }
    }
  };