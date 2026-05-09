import { RuntimeConfig } from "../models/config.model";

/*
 Default Runtime Config
*/
let runtimeConfig: RuntimeConfig = {
  check_interval_seconds: 15,
  request_timeout_ms: 3000,
};

/*
 Get Current Config
*/
export const getConfig = (): RuntimeConfig => {
  return runtimeConfig;
};

/*
 Update Config
*/
export const updateConfig = (
  newConfig: RuntimeConfig
): RuntimeConfig => {
  runtimeConfig = {
    ...runtimeConfig,
    ...newConfig,
  };

  return runtimeConfig;
};