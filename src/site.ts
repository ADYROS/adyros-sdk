/**
 * Where the Adyros API lives. Override with ADYROS_SITE_URL (or the --site flag / `site` option);
 * the default moves to the official domain once it is live.
 */
export const DEFAULT_SITE = (typeof process !== "undefined" && process.env?.ADYROS_SITE_URL) || "https://adyros.vercel.app";
