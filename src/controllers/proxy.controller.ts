import type { Request, Response } from "express";

import {
  addProxies,
  getAllProxies,
  getProxyById,
  clearProxies,
} from "../services/proxy.service";

/*
 POST /proxies
*/
export const createProxies = (
  req: Request,
  res: Response
) => {
  try {
    const { proxies, replace } = req.body;

    if (!Array.isArray(proxies)) {
      return res.status(400).json({
        message: "proxies must be array",
      });
    }

    if (!proxies.every((proxy) => typeof proxy === "string")) {
      return res.status(400).json({
        message: "each proxy must be a string",
      });
    }

    if (replace !== undefined && typeof replace !== "boolean") {
      return res.status(400).json({
        message: "replace must be boolean",
      });
    }

    const created = addProxies(
      proxies,
      replace ?? false
    );

    return res.status(201).json({
      accepted: created.length,

      proxies: created.map((proxy) => ({
        id: proxy.id,
        url: proxy.url,
        status: proxy.status,
      })),
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 GET /proxies
*/
export const listProxies = (
  req: Request,
  res: Response
) => {
  try {
    const proxies =
      getAllProxies();

    const up =
      proxies.filter(
        (proxy) =>
          proxy.status === "up"
      ).length;

    const down =
      proxies.filter(
        (proxy) =>
          proxy.status === "down"
      ).length;

    const failureRate =
      proxies.length === 0
        ? 0
        : Number(
            (
              down /
              proxies.length
            ).toFixed(2)
          );

    return res.status(200).json({
      total: proxies.length,
      up,
      down,
      failure_rate: failureRate,
      proxies,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 GET /proxies/:id
*/
export const getSingleProxy = (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const proxyId =
      Array.isArray(id)
        ? id[0]
        : id;

    const proxy =
      getProxyById(proxyId);

    if (!proxy) {
      return res.status(404).json({
        message: "Proxy not found",
      });
    }

    return res.status(200).json(proxy);

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 GET /proxies/:id/history
*/
export const getProxyHistory = (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const proxyId =
      Array.isArray(id)
        ? id[0]
        : id;

    const proxy =
      getProxyById(proxyId);

    if (!proxy) {
      return res.status(404).json({
        message: "Proxy not found",
      });
    }

    return res.status(200).json(
      proxy.history
    );

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 DELETE /proxies
*/
export const deleteAllProxies = (
  req: Request,
  res: Response
) => {
  try {
    clearProxies();

    return res.status(204).send();

  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};