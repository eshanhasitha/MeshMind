import type { Request, Response } from "express";

const proxies: unknown[] = [];

/*
 DELETE /proxies
*/
export const deleteAllProxies =
    (
        req: Request,
        res: Response
    ) => {

      try {

        /*
         Clear only proxies
        */
        proxies.length = 0;

        /*
         MUST return 204
         with NO BODY
        */
        return res
            .status(204)
            .send();

      } catch (error) {

        return res
            .status(500)
            .json({
              message:
                  "Internal server error",
            });
      }
    };