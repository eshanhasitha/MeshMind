import {
  Proxy,
  ProxyHistory,
  ProxyStatus,
} from "../models/proxy.model";


/*
 In-memory proxy storage
*/
let proxies: Proxy[] = [];

/*
 Extract proxy ID
*/
const extractProxyId = (
  url: string
): string => {
  const parts = url.split("/");

  return parts[parts.length - 1];
};

/*
 Get all proxies
*/
export const getAllProxies =
  (): Proxy[] => {
    return proxies;
  };

/*
 Get proxy by ID
*/
export const getProxyById = (
  id: string
): Proxy | undefined => {
  return proxies.find(
    (proxy) => proxy.id === id
  );
};

/*
 Clear all proxies
*/
export const clearProxies =
  (): void => {
    proxies = [];
  };

/*
 Add proxies
*/
export const addProxies = (
  proxyUrls: string[],
  replace: boolean = false
): Proxy[] => {
  if (replace) {
    proxies = [];
  }

  const newProxies: Proxy[] =
    proxyUrls.map((url) => ({
      id: extractProxyId(url),

      url,

      status: "pending",

      last_checked_at: null,

      consecutive_failures: 0,

      total_checks: 0,

      successful_checks: 0,

      uptime_percentage: 0,

      history: [],
    }));

  proxies.push(...newProxies);

  return newProxies;
};

/*
 Update proxy monitoring data
*/
export const updateProxyStatus = (
  id: string,
  status: ProxyStatus
): void => {
  const proxy = getProxyById(id);

  if (!proxy) {
    return;
  }

  const now =
    new Date().toISOString();

  /*
   Update core fields
  */
  proxy.status = status;

  proxy.last_checked_at =
    now;

  proxy.total_checks += 1;

  /*
   Success/failure logic
  */
  if (status === "up") {
    proxy.successful_checks += 1;

    proxy.consecutive_failures = 0;
  } else {
    proxy.consecutive_failures += 1;
  }

  /*
   Calculate uptime %
  */
  proxy.uptime_percentage =
    Number(
      (
        (proxy.successful_checks /
          proxy.total_checks) *
        100
      ).toFixed(1)
    );

  /*
   Save history
  */
  const historyEntry: ProxyHistory =
    {
      checked_at: now,
      status,
    };

  proxy.history.push(
    historyEntry
  );
};