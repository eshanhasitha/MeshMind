export interface Webhook {

  webhook_id: string;

  url: string;

  created_at: string;
}

export interface WebhookDelivery {

  id: string;

  webhook_url: string;

  event: string;

  alert_id: string;

  status:
    | "pending"
    | "success"
    | "failed";

  attempts: number;

  delivered_at:
    string | null;
}
