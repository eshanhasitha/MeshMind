import express from "express";

import {
  createWebhook,
  listWebhooks,
  listDeliveries,
} from "../controllers/webhook.controller";

const router =
  express.Router();

/*
 POST /webhooks
*/
router.post(
  "/",
  createWebhook
);

/*
 GET /webhooks
*/
router.get(
  "/",
  listWebhooks
);

/*
 GET /webhooks/deliveries
*/
router.get(
  "/deliveries",
  listDeliveries
);

export default router;