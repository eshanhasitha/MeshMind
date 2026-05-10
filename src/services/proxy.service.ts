import { db } from "../db/database";

import {
  Proxy,
  ProxyStatus,
} from "../models/proxy.model";

export interface ProxyStatusUpdate {
  id: string;
  status: ProxyStatus;
  checked_at?: string;
}

/*
 Extract proxy ID
*/
const extractProxyId = (
  url: string
): string => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length > 0) {
      return parts[
        parts.length - 1
      ]!;
    }

    return parsed.host || url;
  } catch (error) {
    const cleaned = url
      .split("?")[0]
      ?.replace(/\/+$/, "");

    return (
      cleaned?.split("/").pop() ||
      url
    );
  }
};

/*
 Get all proxies
*/
export const getAllProxies =
  (): Proxy[] => {

    const rows =
      db.prepare(
        "SELECT * FROM proxies ORDER BY id ASC"
      ).all() as any[];

    return rows.map(
      (row) => ({
        ...row,

        history: db
          .prepare(
            `
            SELECT checked_at, status
            FROM proxy_history
            WHERE proxy_id = ?
            ORDER BY checked_at ASC
            `
          )
          .all(row.id),
      })
    );
  };

/*
 Get proxy by ID
*/
export const getProxyById = (
  id: string
): Proxy | undefined => {

  const row =
    db.prepare(
      `
      SELECT *
      FROM proxies
      WHERE id = ?
      `
    ).get(id) as any;

  if (!row) {
    return undefined;
  }

  return {
    ...row,

    history: db
      .prepare(
        `
        SELECT checked_at, status
        FROM proxy_history
        WHERE proxy_id = ?
        ORDER BY checked_at ASC
        `
      )
      .all(id),
  };
};

/*
 Clear proxies
*/
export const clearProxies = (): void => {
  db.prepare("DELETE FROM proxies").run();
  db.prepare("DELETE FROM proxy_history").run();
};

/*
 Add proxies
*/
export const addProxies = (
  proxyUrls: string[],
  replace: boolean = false
): Proxy[] => {

  if (replace) {
    clearProxies();
  }

  for (const url of proxyUrls) {

    const id =
      extractProxyId(url);

    db.prepare(`
      INSERT OR REPLACE INTO proxies
      (
        id,
        url,
        status,
        last_checked_at,
        consecutive_failures,
        total_checks,
        successful_checks,
        uptime_percentage
      )
      VALUES (
        ?, ?, 'pending',
        NULL,
        0,
        0,
        0,
        0
      )
    `).run(id, url);
  }

  return proxyUrls.map(
    (url) =>
      getProxyById(
        extractProxyId(url)
      )!
  );
};

/*
 Update proxy status
*/
export const updateProxyStatus = (
  id: string,
  status: ProxyStatus
): void => {
  updateProxyStatuses([
    {
      id,
      status,
    },
  ]);
};

export const updateProxyStatuses = (
  updates: ProxyStatusUpdate[]
): void => {
  if (updates.length === 0) {
    return;
  }

  const tx =
    db.transaction(
      (
        items: ProxyStatusUpdate[]
      ) => {
        for (const item of items) {
          const proxy =
            db
              .prepare(
                `
                SELECT
                  consecutive_failures,
                  total_checks,
                  successful_checks
                FROM proxies
                WHERE id = ?
                `
              )
              .get(item.id) as
              | {
                  consecutive_failures: number;
                  total_checks: number;
                  successful_checks: number;
                }
              | undefined;

          if (!proxy) {
            continue;
          }

          const checkedAt =
            item.checked_at ??
            new Date().toISOString();

          const totalChecks =
            proxy.total_checks + 1;

          const successfulChecks =
            item.status === "up"
              ? proxy.successful_checks + 1
              : proxy.successful_checks;

          const consecutiveFailures =
            item.status === "up"
              ? 0
              : proxy.consecutive_failures + 1;

          const uptimePercentage =
            Number(
              (
                (successfulChecks /
                  totalChecks) *
                100
              ).toFixed(1)
            );

          /*
           Update proxy
          */
          db.prepare(`
            UPDATE proxies
            SET
              status = ?,
              last_checked_at = ?,
              consecutive_failures = ?,
              total_checks = ?,
              successful_checks = ?,
              uptime_percentage = ?
            WHERE id = ?
          `).run(
            item.status,
            checkedAt,
            consecutiveFailures,
            totalChecks,
            successfulChecks,
            uptimePercentage,
            item.id
          );

          /*
           Save history
          */
          db.prepare(`
            INSERT INTO proxy_history
            (
              proxy_id,
              checked_at,
              status
            )
            VALUES (?, ?, ?)
          `).run(
            item.id,
            checkedAt,
            item.status
          );
        }
      }
    );

  tx(updates);
};
