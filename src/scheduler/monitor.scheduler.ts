import { getConfig } from "../services/config.service";

import { monitorAllProxies } from "../services/monitor.service";

/*
 Scheduler reference
*/
let scheduler:
  | NodeJS.Timeout
  | null = null;

let cycleInProgress = false;

const runMonitorCycle = async (): Promise<void> => {
  if (cycleInProgress) {
    return;
  }

  cycleInProgress = true;

  try {
    await monitorAllProxies();
  } finally {
    cycleInProgress = false;
  }
};

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
      `[SCHEDULER] Monitoring every ${config.check_interval_seconds}s`
    );

    /*
     Start new scheduler
    */
    scheduler =
      setInterval(
        async () => {
          await runMonitorCycle();
        },

        config.check_interval_seconds *
          1000
      );

    /*
     Run one cycle immediately so new configuration/pool applies now.
    */
    runMonitorCycle().catch(() => {
      /*
       Errors are already handled inside monitoring path.
      */
    });
  };
