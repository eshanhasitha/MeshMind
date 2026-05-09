import { Request, Response } from "express";

import {
  getAlerts,
} from "../services/alert.service";

/*
 GET /alerts
*/
export const listAlerts = (
  req: Request,
  res: Response
) => {

  try {

    const alerts =
      getAlerts();

    /*
     Spec: GET /alerts response body is a JSON array.
    */
    return res
      .status(200)
      .json(alerts);

  } catch (error) {

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
};
