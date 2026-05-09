import axios from "axios";

import {
  getAllProxies,
  updateProxyStatus,
} from "./proxy.service";

import { getConfig } from "./config.service";
import { evaluateAlerts } from "./alert.service";

/*
 Check single proxy
*/
const checkProxy =
  async (
    proxyUrl: string
  ): Promise<
    "up" | "down"
  > => {
    try {
      const config =
        getConfig();

      const response =
        await axios.get(
          proxyUrl,
          {
            timeout:
              config.request_timeout_ms,
          }
        );

      /*
       2xx => UP
      */
      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        return "up";
      }

      /*
       Other => DOWN
      */
      return "down";
    } catch (error: any) {
      /*
       Timeouts
       Connection failures
       5xx
       Refused
       All => DOWN
      */
      return "down";
    }
  };

/*
 Monitor all proxies
*/
export const monitorAllProxies =
  async (): Promise<void> => {
    const proxies =
      getAllProxies();

    for (const proxy of proxies) {
      const status =
        await checkProxy(
          proxy.url
        );

      updateProxyStatus(
        proxy.id,
        status
      );

      console.log(
        `[MONITOR] ${proxy.id} => ${status}`
      );
    }
    /*
    Evaluate alerts
    */
    evaluateAlerts();
  };