import axios from "axios";

import {
  getAllProxies,
  updateProxyStatuses,
} from "./proxy.service";

import { getConfig } from "./config.service";
import { evaluateAlerts } from "./alert.service";

const checkProxy = async (
  proxyUrl: string
): Promise<"up" | "down"> => {
  try {
    const config = getConfig();

    const response = await axios.get(proxyUrl, {
      timeout: config.request_timeout_ms,
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 300) {
      return "up";
    }

    return "down";
  } catch {
    return "down";
  }
};

export const monitorAllProxies = async (): Promise<void> => {
  const proxies = getAllProxies();

  const probeResults = await Promise.all(
    proxies.map(async (proxy) => {
      const status = await checkProxy(proxy.url);

      return {
        id: proxy.id,
        status,
        checked_at:
          new Date().toISOString(),
      };
    })
  );

  updateProxyStatuses(probeResults);

  for (const result of probeResults) {
    console.log(
      `[MONITOR] ${result.id} => ${result.status}`
    );
  }

  await evaluateAlerts();
};
