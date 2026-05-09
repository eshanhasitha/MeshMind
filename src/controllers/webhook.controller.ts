import {
  Request,
  Response,
} from "express";

import {
  addWebhook,
  getWebhooks,
  getDeliveries,
} from "../services/webhook.service";

/*
 POST /webhooks
*/
export const createWebhook =
  (
    req: Request,
    res: Response
  ) => {

    try {

      const { url } =
        req.body;

      /*
       Validation
      */
      if (
        !url ||
        typeof url !==
          "string"
      ) {

        return res
          .status(400)
          .json({
            message:
              "url is required",
          });
      }

      const webhook =
        addWebhook(url);

      return res
        .status(201)
        .json(webhook);

    } catch (error) {

      return res
        .status(500)
        .json({
          message:
            "Internal server error",
        });
    }
  };

/*
 GET /webhooks
*/
export const listWebhooks =
  (
    req: Request,
    res: Response
  ) => {

    return res
      .status(200)
      .json({
        total:
          getWebhooks()
            .length,

        webhooks:
          getWebhooks(),
      });
  };

/*
 GET /webhooks/deliveries
*/
export const listDeliveries =
  (
    req: Request,
    res: Response
  ) => {

    return res
      .status(200)
      .json({
        total:
          getDeliveries()
            .length,

        deliveries:
          getDeliveries(),
      });
  };
