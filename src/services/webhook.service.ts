import { v4 as uuidv4 } from "uuid";
import axios from "axios";

/*
 Send webhook event
*/
interface WebhookDelivery {
  id: string;
  webhook_url: string;
  event: string;
  status: "pending" | "success" | "failed";
  attempts: number;
  delivered_at: string | null;
}

const retryableStatuses = [
  408,
  425,
  429,
  500,
  502,
  503,
  504,
];

export const sendWebhookEvent =
  async (
    event: string,
    alert: any
  ): Promise<void> => {

    const deliveries: WebhookDelivery[] = [];
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
       REQUIRED payload contract
      */
      const payload =
        event === "alert.fired"
          ? {
              event,

              alert_id:
                alert.alert_id,

              failure_rate:
                alert.failure_rate,

              fired_at:
                alert.fired_at,
            }
          : {
              event,

              alert_id:
                alert.alert_id,

              resolved_at:
                alert.resolved_at,
            };

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
           Retry only allowed statuses
          */
          if (
            retryableStatuses.includes(
              response.status
            )
          ) {

            console.log(
              `🔁 Webhook retry...`
            );

            continue;
          }

          /*
           Permanent failure
          */
          delivery.status = "failed";

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
              `🔁 Webhook retry...`
            );

            continue;
          }

          delivery.status = "failed";

          console.log(
            "❌ Webhook failed:",
            status || error?.message
          );

          delivered = true;
        }
      }
    }
  };