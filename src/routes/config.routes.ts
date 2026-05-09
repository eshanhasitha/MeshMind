import express from "express";

import {
  getRuntimeConfig,
  setRuntimeConfig,
} from "../controllers/config.controller";

const router = express.Router();

/*
 GET /config
*/
router.get("/", getRuntimeConfig);

/*
 POST /config
*/
router.post("/", setRuntimeConfig);

export default router;