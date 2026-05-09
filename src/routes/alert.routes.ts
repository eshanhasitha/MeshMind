import express from "express";

import {
  listAlerts,
} from "../controllers/alert.controller";

const router =
  express.Router();

/*
 GET /alerts
*/
router.get(
  "/",
  listAlerts
);

export default router;