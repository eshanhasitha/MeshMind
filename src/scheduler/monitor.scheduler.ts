import { getConfig } from "../services/config.service";

import { monitorAllProxies } from "../services/monitor.service";

/*
 Scheduler reference
*/
let scheduler:
  | NodeJS.Timeout
  | null = null;

/*
 Start monitoring scheduler
*/
export const startMonitoringScheduler =
  (): void => {
    /*
     Clear old scheduler
    */
    if (scheduler) {
      clearInterval(
        scheduler
      );
    }

    const config =
      getConfig();

    console.log(
      `📡 Monitoring every ${config.check_interval_seconds}s`
    );

    /*
     Start new scheduler
    */
    scheduler =
      setInterval(
        async () => {
          await monitorAllProxies();
        },

        config.check_interval_seconds *
          1000
      );
  };