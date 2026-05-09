import { Request, Response } from "express";

import {
  addIntegration,
  getIntegrations,
} from "../services/integration.service";

export const createIntegration = (
  req: Request,
  res: Response
) => {

  const {
    type,
    webhook_url,
    username,
    events,
  } = req.body;

  /*
   Validate type
  */
  if (
    type !== "slack" &&
    type !== "discord"
  ) {
    return res.status(400).json({
      message:
        "type must be slack or discord",
    });
  }

  /*
   Validate webhook URL
  */
  if (
    !webhook_url ||
    typeof webhook_url !== "string"
  ) {
    return res.status(400).json({
      message:
        "webhook_url is required",
    });
  }

  /*
   Validate events
  */
  if (
    events !== undefined &&
    (
      !Array.isArray(events) ||
      events.some(
        (event) =>
          typeof event !== "string"
      )
    )
  ) {
    return res.status(400).json({
      message:
        "events must be string array",
    });
  }

  const integration =
    addIntegration(
      type,
      webhook_url,
      username,
      events || []
    );

  return res.status(201).json({
    id: integration.id,
    type: integration.type,
    webhook_url: integration.webhook_url,
    username: integration.username,
    events: integration.events,
    created_at: integration.created_at,
  });
};

export const listIntegrations = (
  req: Request,
  res: Response
) => {

  return res.status(200).json({
    total:
      getIntegrations().length,

    integrations:
      getIntegrations(),
  });
};