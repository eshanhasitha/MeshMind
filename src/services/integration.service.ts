import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Alert } from "../models/alert.model";
import { Integration, IntegrationType } from "../models/integration.model";

let integrations: Integration[] = [];

export const addIntegration = (
  type: IntegrationType,
  webhook_url: string,
  username?: string
): Integration => {
  const integration: Integration = {
    id: uuidv4(),
    type,
    webhook_url,
    username,
    created_at: new Date().toISOString(),
  };

  integrations.push(integration);
  return integration;
};

export const getIntegrations = (): Integration[] => {
  return integrations;
};

const buildSlackPayload = (event: string, alert: Alert, username?: string) => {
  return {
    username: username || "ProxyMaze",
    text: `ProxyMaze ${event}`,
    attachments: [
      {
        title: event,
        text: alert.message,
        fields: [
          { title: "Alert ID", value: alert.alert_id, short: false },
          { title: "Status", value: alert.status, short: true },
          { title: "Failure Rate", value: String(alert.failure_rate), short: true },
          { title: "Failed Proxies", value: alert.failed_proxy_ids.join(", ") || "None", short: false },
          { title: "Threshold", value: String(alert.threshold), short: true },
          { title: "Fired At", value: alert.fired_at, short: false },
        ],
      },
    ],
  };
};

const buildDiscordPayload = (event: string, alert: Alert) => {
  return {
    embeds: [
      {
        title: `ProxyMaze ${event}`,
        description: alert.message,
        color: event === "alert.fired" ? 15158332 : 3066993,
        fields: [
          { name: "Alert ID", value: alert.alert_id },
          { name: "Status", value: alert.status, inline: true },
          { name: "Failure Rate", value: String(alert.failure_rate), inline: true },
          { name: "Threshold", value: String(alert.threshold), inline: true },
          { name: "Failed Proxy IDs", value: alert.failed_proxy_ids.join(", ") || "None" },
        ],
        footer: {
          text: `Fired at ${alert.fired_at}`,
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
    try {
      const payload =
        integration.type === "slack"
          ? buildSlackPayload(event, alert, integration.username)
          : buildDiscordPayload(event, alert);

      await axios.post(integration.webhook_url, payload);

      console.log(`✅ ${integration.type} integration sent`);
    } catch (error: any) {
      console.log(
        `❌ ${integration.type} integration failed:`,
        error?.response?.status || error?.message
      );
    }
  }
};