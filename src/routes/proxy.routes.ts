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
 GET /proxies/:id
*/
router.get(
  "/:id",
  getSingleProxy
);

/*
 GET /proxies/:id/history
*/
router.get(
  "/:id/history",
  getProxyHistory
);

/*
 DELETE /proxies
*/
router.delete(
  "/",
  deleteAllProxies
);

export default router;