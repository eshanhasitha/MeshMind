import { Request, Response } from "express";

import {
  addProxies,
  getAllProxies,
} from "../services/proxy.service";
import { getProxyById } from "../services/proxy.service";
import {
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
    const { proxies, replace } =
      req.body;

    /*
     Validation
    */
    if (
      !Array.isArray(proxies)
    ) {
      return res.status(400).json({
        message:
          "proxies must be an array",
      });
    }

    /*
     Validate each URL
    */
    for (const url of proxies) {
      if (
        typeof url !== "string"
      ) {
        return res.status(400).json({
          message:
            "all proxies must be strings",
        });
      }
    }

    /*
     Add proxies
    */
    const accepted =
      addProxies(
        proxies,
        replace || false
      );

    return res
      .status(201)
      .json({
        accepted:
          accepted.length,

        proxies: accepted.map(
          (proxy) => ({
            id: proxy.id,

            url: proxy.url,

            status:
              proxy.status,
          })
        ),
      });
  } catch (error) {
    return res.status(500).json({
      message:
        "Internal server error",
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

    const total =
      proxies.length;

    const up = proxies.filter(
      (proxy) =>
        proxy.status === "up"
    ).length;

    const down = proxies.filter(
      (proxy) =>
        proxy.status === "down"
    ).length;

    const failure_rate =
      total === 0
        ? 0
        : down / total;

    return res
      .status(200)
      .json({
        total,
        up,
        down,
        failure_rate,
        proxies,
      });
  } catch (error) {
    return res.status(500).json({
      message:
        "Internal server error",
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

    let { id } = req.params;

    if (Array.isArray(id)) {
      id = id[0];
    }

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const proxy = getProxyById(id);

    /*
     Not found
    */
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

    let { id } = req.params;

    if (Array.isArray(id)) {
      id = id[0];
    }

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const proxy = getProxyById(id);

    /*
     Not found
    */
    if (!proxy) {
      return res.status(404).json({
        message: "Proxy not found",
      });
    }

    return res.status(200).json({
      proxy_id: proxy.id,

      total_checks:
        proxy.total_checks,

      uptime_percentage:
        proxy.uptime_percentage,

      history: proxy.history,
    });

  } catch (error) {

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/*
 DELETE /proxies
*/
export const deleteAllProxies =
  (
    req: Request,
    res: Response
  ) => {

    try {

      clearProxies();

      return res
        .status(200)
        .json({
          message:
            "Proxy pool cleared",
        });

    } catch (error) {

      return res
        .status(500)
        .json({
          message:
            "Internal server error",
        });
    }
  };

