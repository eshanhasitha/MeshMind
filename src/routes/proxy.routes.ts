import express from "express";

import {
  createProxies,
  listProxies,
  getSingleProxy,
  getProxyHistory,
  deleteAllProxies,
} from "../controllers/proxy.controller";

const router = express.Router();

/*
 POST /proxies
*/
router.post(
  "/",
  createProxies
);

/*
 GET /proxies
*/
router.get(
  "/",
  listProxies
);

/*
 DELETE /proxies
*/
router.delete(
  "/",
  deleteAllProxies
);

/*
 IMPORTANT:
 history route MUST come BEFORE /:id
*/
router.get(
  "/:id/history",
  getProxyHistory
);

/*
 GET /proxies/:id
*/
router.get(
  "/:id",
  getSingleProxy
);

export default router;