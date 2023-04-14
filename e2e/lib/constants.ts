import { Duration } from "../cypress/support/utils";

// time to wait for fiftyone app to load
export const DEFAULT_APP_LOAD_TIMEOUT = Duration.Minutes(2);

export const DEFAULT_APP_PORT = 8787;
export const DEFAULT_APP_HOSTNAME = "127.0.0.1";
export const DEFAULT_APP_ADDRESS = `http://${DEFAULT_APP_HOSTNAME}:${DEFAULT_APP_PORT}`;

export const GHOST_SERVER_TIMEOUT =
  process.env.NODE_ENV === "development"
    ? Duration.Seconds(3)
    : Duration.Seconds(6);
