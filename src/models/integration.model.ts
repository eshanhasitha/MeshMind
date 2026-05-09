export type IntegrationType =
  | "slack"
  | "discord";

export interface Integration {
  id: string;

  type: IntegrationType;

  webhook_url: string;

  username?: string;

  events: string[];

  created_at: string;
}