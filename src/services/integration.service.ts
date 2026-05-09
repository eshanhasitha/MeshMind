import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Integration,
  IntegrationType,
} from "../models/integration.model";

import { Alert } from "../models/alert.model";

let integrations: Integration[] = [];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const addIntegration = (
  type: IntegrationType,
  webhook_url: string,
  username?: string,
  events: string[] = []
): Integration => {
  const normalizedWebhookUrl = webhook_url.trim();
  const normalizedEvents = [
    ...new Set(
      events
        .map((event) => event.trim())
        .filter((event) => event.length > 0)
    ),
  ];
  const normalizedUsername =
    typeof username === "string"
      ? username.trim()
      : undefined;

  const existing = integrations.find(
    (integration) =>
      integration.type === type &&
      integration.webhook_url === normalizedWebhookUrl
  );

  if (existing) {
    existing.username = normalizedUsername;
    existing.events = normalizedEvents;
    return existing;
  }

  const integration: Integration = {
    id: uuidv4(),
    type,
    webhook_url: normalizedWebhookUrl,
    username: normalizedUsername,
    events: normalizedEvents,
    created_at: new Date().toISOString(),
  };

  integrations.push(integration);
  return integration;
};

export const getIntegrations = (): Integration[] => {
  return integrations;
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

const buildSlackPayload = (
  event: string,
  alert: Alert,
  username?: string
) => {
  const safeUsername =
    username && username.trim().length > 0
      ? username.trim()
      : "ProxyMaze";

  const color = event === "alert.fired" ? "#E74C3C" : "#2ECC71";

  const fields = [
    { title: "Alert ID", value: String(alert.alert_id || "unknown") },
    { title: "Failure Rate", value: String(alert.failure_rate ?? 0) },
    { title: "Failed Proxies", value: String(alert.failed_proxies ?? 0) },
    { title: "Threshold", value: String(alert.threshold ?? 0.2) },
    {
      title: "Failed IDs",
      value:
        alert.failed_proxy_ids && alert.failed_proxy_ids.length > 0
          ? alert.failed_proxy_ids.join(", ")
          : "None",
    },
  ];

  // Add Fired At field (required by spec)
  if (event === "alert.fired") {
    fields.push({
      title: "Fired At",
      value: alert.fired_at || new Date().toISOString(),
    });
  }

  return {
    username: safeUsername,
    text: `ProxyMaze ${event === "alert.fired" ? "Alert Fired" : "Alert Resolved"}: ${alert.message || "Alert event"}`,
    attachments: [
      {
        color: color,
        fields: fields,
        footer: "ProxyMaze Monitor",
        ts: Math.floor(Date.now() / 1000), // Unix epoch timestamp as integer
      },
    ],
  };
};

const buildDiscordPayload = (event: string, alert: Alert) => {
  // Red for fired, green for resolved
  const color = event === "alert.fired" ? 15158332 : 3066993; // #E74C3C (15158332) and #2ECC71 (3066993)

  const fields = [
    { name: "Alert ID", value: String(alert.alert_id) },
    { name: "Failure Rate", value: String(alert.failure_rate ?? 0) },
    { name: "Failed Proxies", value: String(alert.failed_proxies ?? 0) },
    { name: "Threshold", value: String(alert.threshold ?? 0.2) },
    {
      name: "Failed IDs",
      value:
        alert.failed_proxy_ids && alert.failed_proxy_ids.length > 0
          ? alert.failed_proxy_ids.join(", ")
          : "None",
    },
  ];

  return {
    embeds: [
      {
        title: `ProxyMaze ${event === "alert.fired" ? "Alert Fired" : "Alert Resolved"}`,
        description: alert.message || `Proxy pool alert: ${event}`,
        color: color,
        fields: fields,
        footer: {
          text: "ProxyMaze Monitor",
        },
      },
    ],
  };
};

const parseRetryAfterSeconds = (error: any): number => {
  const retryAfterRaw =
    error?.response?.headers?.["retry-after"] ??
    error?.response?.data?.retry_after ??
    5;

  const retryAfter = Number(retryAfterRaw);

  if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
    return 5;
  }

  return retryAfter;
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

export const sendIntegrationEvent = async (
  event: string,
  alert: Alert
): Promise<void> => {
  for (const integration of integrations) {
    // Skip if integration doesn't have events specified or event is not in the list
    if (
      integration.events.length > 0 &&
      !integration.events.includes(event)
    ) {
      continue;
    }

    const payload =
      integration.type === "slack"
        ? buildSlackPayload(event, alert, integration.username)
        : buildDiscordPayload(event, alert);

    let maxRetries = 5;
    let retryDelay = 500;
    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
      try {
        attempts += 1;

        await postJsonWithRedirects(
          integration.webhook_url,
          payload,
          5000
        );

        console.log(`[INTEGRATION] ${integration.type} sent successfully`);
        success = true;
      } catch (error: any) {
        const status = error?.response?.status;

        // Handle rate limiting
        if (status === 429) {
          const retryAfter = parseRetryAfterSeconds(error);

          console.log(
            `[INTEGRATION] ${integration.type} rate limited (429). Retrying after ${retryAfter}s`
          );

          if (attempts < maxRetries) {
            await sleep(retryAfter * 1000);
          }
          continue;
        }

        // Handle transient failures (5xx)
        if ([500, 502, 503, 504].includes(status)) {
          console.log(
            `[INTEGRATION] ${integration.type} transient failure (${status}), attempt ${attempts}/${maxRetries}`
          );

          if (attempts < maxRetries) {
            await sleep(retryDelay);
            retryDelay = Math.min(retryDelay * 2, 5000);
          }
          continue;
        }

        // Non-transient failure
        console.log(
          `[INTEGRATION] ${integration.type} failed`,
          status || error?.message
        );
        break;
      }
    }

    if (!success && attempts >= maxRetries) {
      console.log(
        `[INTEGRATION] ${integration.type} failed after ${maxRetries} attempts`
      );
    }
  }
};
