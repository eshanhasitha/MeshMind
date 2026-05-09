import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Webhook,
  WebhookDelivery,
} from "../models/webhook.model";

let webhooks: Webhook[] = [];
let deliveries: WebhookDelivery[] = [];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const getWebhooks = (): Webhook[] => {
  return webhooks;
};

export const getDeliveries = (): WebhookDelivery[] => {
  return deliveries;
};

export const addWebhook = (url: string): Webhook => {
  const normalizedUrl = url.trim();

  const existing = webhooks.find(
    (webhook) => webhook.url === normalizedUrl
  );

  if (existing) {
    return existing;
  }

  const webhook: Webhook = {
    webhook_id: `wh-${uuidv4()}`,
    url: normalizedUrl,
    created_at: new Date().toISOString(),
  };

  webhooks.push(webhook);

  return webhook;
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

type ResponseLike = {
  status?: number;
  data?: unknown;
  headers?: Record<string, unknown>;
};

type HttpError = Error & {
  response?: ResponseLike;
};

const createHttpError = (
  message: string,
  response: ResponseLike
): HttpError => {
  const error = new Error(message) as HttpError;
  error.response = response;
  return error;
};

const postJsonWithRedirects = async (
  url: string,
  payload: unknown,
  timeoutMs: number,
  maxRedirects: number = 5
): Promise<void> => {
  let currentUrl = url;

  for (let i = 0; i <= maxRedirects; i += 1) {
    const response = await axios.post(
      currentUrl,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );

    if (response.status >= 200 && response.status < 300) {
      return;
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const rawLocation = response.headers?.location;
      const location =
        typeof rawLocation === "string"
          ? rawLocation
          : Array.isArray(rawLocation)
            ? rawLocation[0]
            : undefined;

      if (!location) {
        throw createHttpError(
          `Redirect status ${response.status} without location header`,
          {
            status: response.status,
            data: response.data,
            headers: response.headers as Record<string, unknown>,
          }
        );
      }

      currentUrl = new URL(
        location,
        currentUrl
      ).toString();

      continue;
    }

    throw createHttpError(
      `Request failed with status ${response.status}`,
      {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, unknown>,
      }
    );
  }

  throw createHttpError(
    "Too many redirects",
    { status: 310 }
  );
};

const isTransientFailure = (status?: number): boolean => {
  return [500, 502, 503, 504].includes(status || 0);
};

export const sendWebhookEvent = async (
  event: string,
  payload: any
): Promise<void> => {
  const alertId = payload.alert_id;

  for (const webhook of webhooks) {
    const existingDelivery = deliveries.find(
      (delivery) =>
        delivery.webhook_url === webhook.url &&
        delivery.event === event &&
        delivery.alert_id === alertId
    );

    if (
      existingDelivery &&
      (
        existingDelivery.status === "success" ||
        existingDelivery.status === "pending"
      )
    ) {
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

        await postJsonWithRedirects(
          webhook.url,
          payload,
          5000
        );

        delivery.status = "success";
        delivery.delivered_at = new Date().toISOString();

        console.log(`[WEBHOOK] delivered ${event}`);
      } catch (error: any) {
        const status = error?.response?.status;

        if (isTransientFailure(status)) {
          console.log(
            `[WEBHOOK] transient ${status}, retry attempt ${delivery.attempts}`
          );

          await sleep(1000);
          continue;
        }

        delivery.status = "failed";

        console.log(
          "[WEBHOOK] failed:",
          status || error?.message
        );

        break;
      }
    }
  }
};
