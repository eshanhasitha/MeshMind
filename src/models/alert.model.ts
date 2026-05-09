export type AlertStatus =
  | "active"
  | "resolved";

export interface Alert {

  alert_id: string;

  status: AlertStatus;

  failure_rate: number;

  total_proxies: number;

  failed_proxies: number;

  failed_proxy_ids: string[];

  threshold: number;

  fired_at: string;

  resolved_at: string | null;

  message: string;
}