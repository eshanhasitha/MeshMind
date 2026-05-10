import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Integration,
  IntegrationType,
} from "../models/integration.model";

import { Alert } from "../models/alert.model";

let integrations: Integration[] = [];

const sentEvents = new Set<string>();

export const addIntegration = (
  type: IntegrationType,
  webhook_url: string,
  username?: string,
  events: string[] = []
): Integration => {
  integrations = integrations.filter(
    (integration) => integration.type !== type
  );

  const integration: Integration = {
    id: uuidv4(),
    type,
    webhook_url,
    username,
    events,
    created_at: new Date().toISOString(),
  };

  integrations.push(integration);

  return integration;
};

export const getIntegrations = (): Integration[] => {
  return integrations;
};

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
    maxRedirects: 0,
    validateStatus: () => true,
  });
};

const postWithManualRedirect = async (
  url: string,
  payload: any
) => {
  let response = await postJson(url, payload);

  if (
    [301, 302, 307, 308].includes(response.status) &&
    response.headers.location
  ) {
    response = await postJson(
      response.headers.location,
      payload
    );
  }

  return response;
};

const buildSlackPayload = (
  event: string,
  alert: Alert,
  username?: string
) => {
  return {
    username: username || "ProxyWatch",
    text: `ProxyMaze ${event}: ${alert.message}`,

    attachments: [
      {
        color:
          event === "alert.fired"
            ? "#E74C3C"
            : "#2ECC71",

        fields: [
          {
            title: "Alert ID",
            value: alert.alert_id,
            short: false,
          },
          {
            title: "Failure Rate",
            value: String(alert.failure_rate),
            short: true,
          },
          {
            title: "Failed Proxies",
            value: String(alert.failed_proxies),
            short: true,
          },
          {
            title: "Threshold",
            value: String(alert.threshold),
            short: true,
          },
          {
            title: "Failed IDs",
            value:
              alert.failed_proxy_ids.length > 0
                ? alert.failed_proxy_ids.join(", ")
                : "None",
            short: false,
          },
          {
            title: "Fired At",
            value: alert.fired_at || "N/A",
            short: false,
          },
        ],

        footer: "ProxyMaze Monitor",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
};

const buildDiscordPayload = (
  event: string,
  alert: Alert
) => {
  return {
    content: `ProxyMaze ${event}`,

    embeds: [
      {
        title: `ProxyMaze ${event}`,
        description:
          alert.message ||
          "Proxy alert triggered",

        color:
          event === "alert.fired"
            ? 16711680
            : 65280,

        fields: [
          {
            name: "Alert ID",
            value: String(alert.alert_id),
            inline: false,
          },
          {
            name: "Failure Rate",
            value: String(alert.failure_rate),
            inline: true,
          },
          {
            name: "Failed Proxies",
            value: String(alert.failed_proxies),
            inline: true,
          },
          {
            name: "Threshold",
            value: String(alert.threshold),
            inline: true,
          },
          {
            name: "Failed IDs",
            value:
              alert.failed_proxy_ids.length > 0
                ? alert.failed_proxy_ids.join(", ")
                : "None",
            inline: false,
          },
        ],

        footer: {
          text: "ProxyMaze Monitor",
        },

        timestamp: new Date().toISOString(),
      },
    ],
  };
};

export const sendIntegrationEvent = async (
  event: string,
  alert: Alert
): Promise<void> => {
  for (const integration of integrations) {
    if (
      integration.events.length > 0 &&
      !integration.events.includes(event)
    ) {
      continue;
    }

    const dedupeKey =
      `${integration.type}-${event}-${alert.alert_id}`;

    if (sentEvents.has(dedupeKey)) {
      continue;
    }

    sentEvents.add(dedupeKey);

    const payload =
      integration.type === "slack"
        ? buildSlackPayload(
            event,
            alert,
            integration.username
          )
        : buildDiscordPayload(
            event,
            alert
          );

    const response = await postWithManualRedirect(
      integration.webhook_url,
      payload
    );

    if (
      response.status >= 200 &&
      response.status < 300
    ) {
      console.log(
        `✅ ${integration.type} integration sent`
      );

      continue;
    }

    if (response.status === 429) {
      console.log(
        `[INTEGRATION] ${integration.type} rate limited (429). Skipping retry.`
      );

      continue;
    }

    console.log(
      `❌ ${integration.type} integration failed`,
      response.status
    );
  }
};