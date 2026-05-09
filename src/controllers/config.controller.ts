import { Request, Response } from "express";

import {
  getConfig,
  updateConfig,
} from "../services/config.service";

import { startMonitoringScheduler } from "../scheduler/monitor.scheduler";

/*
 GET /config
*/
export const getRuntimeConfig = (
  req: Request,
  res: Response
) => {
  return res.status(200).json(getConfig());
};

/*
 POST /config
*/
export const setRuntimeConfig = (
  req: Request,
  res: Response
) => {
  try {
    const {
      check_interval_seconds,
      request_timeout_ms,
    } = req.body;

    /*
      Validation
    */
    if (
      typeof check_interval_seconds !== "number" ||
      typeof request_timeout_ms !== "number"
    ) {
      return res.status(400).json({
        message:
          "check_interval_seconds and request_timeout_ms must be numbers",
      });
    }

    const updated = updateConfig({
      check_interval_seconds,
      request_timeout_ms,
    });

    /*
     Restart monitoring immediately
    */
    startMonitoringScheduler();

    return res.status(200).json(updated);

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};