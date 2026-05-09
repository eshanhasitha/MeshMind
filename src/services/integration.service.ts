import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  Integration,
  IntegrationType,
} from "../models/integration.model";

import { Alert } from "../models/alert.model";

let integrations: Integration[] = [];

export const addIntegration = (
  type: IntegrationType,
  webhook_url: string,
  username?: string,
  events: string[] = []
): Integration => {
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

const buildSlackPayload = (
  event: string,
  alert: Alert,
  username?: string
) => {
  return {
    username: username || "ProxyMaze",
    text: `ProxyMaze ${event}: ${alert.message || "Alert event"}`,
    attachments: [
      {
        color: event === "alert.fired" ? "#E74C3C" : "#2ECC71",
        fields: [
          { title: "Alert ID", value: alert.alert_id || "unknown", short: false },
          { title: "Failure Rate", value: String(alert.failure_rate ?? 0), short: true },
          { title: "Failed Proxies", value: String(alert.failed_proxies ?? 0), short: true },
          { title: "Threshold", value: String(alert.threshold ?? 0.2), short: true },
          {
            title: "Failed IDs",
            value:
              alert.failed_proxy_ids && alert.failed_proxy_ids.length > 0
                ? alert.failed_proxy_ids.join(", ")
                : "None",
            short: false,
          },
          { title: "Fired At", value: alert.fired_at || "N/A", short: false },
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
    username: "ProxyMaze",
    embeds: [
      {
        title: `ProxyMaze ${event}`,
        description: alert.message || `ProxyMaze ${event}`,
        color: event === "alert.fired" ? 15158332 : 3066993,
        fields: [
          {
            name: "Alert ID",
            value: alert.alert_id || "unknown",
            inline: false,
          },
          {
            name: "Failure Rate",
            value: String(alert.failure_rate ?? 0),
            inline: true,
          },
          {
            name: "Failed Proxies",
            value: String(alert.failed_proxies ?? 0),
            inline: true,
          },
          {
            name: "Threshold",
            value: String(alert.threshold ?? 0.2),
            inline: true,
          },
          {
            name: "Failed IDs",
            value:
              alert.failed_proxy_ids && alert.failed_proxy_ids.length > 0
                ? alert.failed_proxy_ids.join(", ")
                : "None",
            inline: false,
          },
        ],
        footer: {
          text: "ProxyMaze Monitor",
        },
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

    const payload =
      integration.type === "slack"
        ? buildSlackPayload(event, alert, integration.username)
        : buildDiscordPayload(event, alert);

    try {
      await axios.post(integration.webhook_url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });

      console.log(`✅ ${integration.type} integration sent`);
    } catch (error: any) {
      console.log(
        `❌ ${integration.type} integration failed`,
        error?.response?.status || error?.message
      );
    }
  }
};