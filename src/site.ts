/**
 * Where the Adyros API lives: the official domain by default. Override with ADYROS_SITE_URL
 * (or the --site flag / `site` option) to point at another deployment.
 */
export const DEFAULT_SITE = (typeof process !== "undefined" && process.env?.ADYROS_SITE_URL) || "https://adyros.com";
