import { db } from "../db/database";

import {
  Proxy,
  ProxyStatus,
} from "../models/proxy.model";

/*
 Extract proxy ID
*/
const extractProxyId = (
  url: string
): string => {

  return (
    url.split("/").pop() ||
    url
  );
};

/*
 Get all proxies
*/
export const getAllProxies =
  (): Proxy[] => {

    const rows =
      db.prepare(
        "SELECT * FROM proxies"
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
        `
      )
      .all(id),
  };
};

/*
 Clear proxies
*/
export const clearProxies =
  (): void => {

    db.prepare(
      "DELETE FROM proxies"
    ).run();

    db.prepare(
      "DELETE FROM proxy_history"
    ).run();
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

  const proxy =
    getProxyById(id);

  if (!proxy) {
    return;
  }

  const now =
    new Date().toISOString();

  const totalChecks =
    proxy.total_checks + 1;

  const successfulChecks =
    status === "up"
      ? proxy.successful_checks + 1
      : proxy.successful_checks;

  const consecutiveFailures =
    status === "up"
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
    status,
    now,
    consecutiveFailures,
    totalChecks,
    successfulChecks,
    uptimePercentage,
    id
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
    id,
    now,
    status
  );
};