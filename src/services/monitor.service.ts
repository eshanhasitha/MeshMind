import axios from "axios";

import {
  getAllProxies,
  updateProxyStatus,
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

  for (const proxy of proxies) {
    const status = await checkProxy(proxy.url);

    updateProxyStatus(proxy.id, status);

    console.log(`[MONITOR] ${proxy.id} => ${status}`);
  }

  await evaluateAlerts();
};