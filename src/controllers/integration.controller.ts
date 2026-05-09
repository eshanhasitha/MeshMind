import { Request, Response } from "express";
import { addIntegration, getIntegrations } from "../services/integration.service";

export const createIntegration = (req: Request, res: Response) => {
  const { type, webhook_url, username } = req.body;

  if (type !== "slack" && type !== "discord") {
    return res.status(400).json({
      message: "type must be slack or discord",
    });
  }

  if (!webhook_url || typeof webhook_url !== "string") {
    return res.status(400).json({
      message: "webhook_url is required",
    });
  }

  const integration = addIntegration(type, webhook_url, username);

  return res.status(201).json(integration);
};

export const listIntegrations = (req: Request, res: Response) => {
  return res.status(200).json({
    total: getIntegrations().length,
    integrations: getIntegrations(),
  });
};