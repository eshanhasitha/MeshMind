import { v4 as uuidv4 } from "uuid";
import axios from "axios";

/*
 Webhook delivery type
*/
interface WebhookDelivery {
  id: string;
  webhook_url: string;
  event: string;
  status: "pending" | "success" | "failed";
  attempts: number;
  delivered_at: string | null;
}

/*
 Persistent deliveries
*/
const deliveries: WebhookDelivery[] = [];

/*
 Retryable HTTP codes
*/
const retryableStatuses = [
  408,
  425,
  429,
  500,
  502,
  503,
  504,
];

/*
 Persistent webhooks
*/
const webhooks: { id: string; url: string; created_at: string }[] = [];

/*
 Add webhook
*/
export const addWebhook = (url: string) => {
  const webhook = {
    id: uuidv4(),
    url,
    created_at: new Date().toISOString(),
  };
  webhooks.push(webhook);
  return webhook;
};

/*
 Get webhooks
*/
export const getWebhooks = () => {
  return webhooks;
};

/*
 Send webhook event
*/
export const sendWebhookEvent =
  async (
    event: string,
    alert: any
  ): Promise<void> => {

    const webhooks =
      Array.isArray((alert as any)?.webhooks)
        ? (alert as any).webhooks
        : (alert as any)?.webhook
          ? [(alert as any).webhook]
          : [];

    for (const webhook of webhooks) {

      /*
       Prevent duplicate success
      */
      const existing =
        deliveries.find(
          (delivery) =>
            delivery.webhook_url === webhook.url &&
            delivery.event === event &&
            delivery.status === "success"
        );

      if (existing) {
        continue;
      }

      /*
       REQUIRED evaluator payload
      */
      const payload = {
        event,

        alert_id:
          alert.alert_id,

        status:
          alert.status,

        failure_rate:
          alert.failure_rate,

        total_proxies:
          alert.total_proxies,

        failed_proxies:
          alert.failed_proxies,

        failed_proxy_ids:
          alert.failed_proxy_ids,

        threshold_value:
          alert.threshold,

        fired_at:
          alert.fired_at,

        resolved_at:
          alert.resolved_at || null,

        message:
          alert.message,
      };

      /*
       Create delivery
      */
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

      deliveries.push(delivery);

      let delivered = false;

      const maxRetries = 3;

      while (
        !delivered &&
        delivery.attempts < maxRetries
      ) {

        try {

          delivery.attempts += 1;

          const response =
            await axios.post(
              webhook.url,
              payload,
              {
                timeout: 5000,
              }
            );

          /*
           Success
          */
          if (
            response.status >= 200 &&
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
           Retry allowed codes
          */
          if (
            retryableStatuses.includes(
              response.status
            )
          ) {

            console.log(
              "🔁 Webhook retry..."
            );

            await new Promise(
              (resolve) =>
                setTimeout(resolve, 2000)
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

          const status =
            error?.response?.status;

          /*
           Retry allowed errors
          */
          if (
            retryableStatuses.includes(status)
          ) {

            console.log(
              "🔁 Webhook retry..."
            );

            await new Promise(
              (resolve) =>
                setTimeout(resolve, 2000)
            );

            continue;
          }

          /*
           Failure
          */
          delivery.status =
            "failed";

          console.log(
            "❌ Webhook failed:",
            status || error?.message
          );

          delivered = true;
        }
      }
    }
  };

/*
 Get deliveries
*/
export const getDeliveries =
  (): WebhookDelivery[] => {
    return deliveries;
  };