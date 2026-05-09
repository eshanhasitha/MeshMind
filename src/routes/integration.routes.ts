import express from "express";

import {
  createIntegration,
  listIntegrations,
} from "../controllers/integration.controller";

const router = express.Router();

router.post("/", createIntegration);
router.get("/", listIntegrations);

export default router;