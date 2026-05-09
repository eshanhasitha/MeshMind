export type ProxyStatus =
  | "pending"
  | "up"
  | "down";

export interface ProxyHistory {
  checked_at: string;
  status: ProxyStatus;
}

export interface Proxy {
  id: string;
  url: string;
  status: ProxyStatus;

  last_checked_at: string | null;

  consecutive_failures: number;

  total_checks: number;

  successful_checks: number;

  uptime_percentage: number;

  history: ProxyHistory[];
}