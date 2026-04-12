export const UNKNOWN_LABEL = "Unknown";
export const PAGE_SIZE = 24;
export const MAP_PAGE_SIZE = 300;
export const IMPORT_LOG_DIR = "data/import-logs";
export const AUTH_COOKIE_NAME = "bryozoo.session";
export const AUTO_BOOTSTRAP_SOURCE_TYPE = "auto-bootstrap";
export const DEFAULT_BOOTSTRAP_WORKBOOK_URL =
  process.env.DEFAULT_BOOTSTRAP_WORKBOOK_URL ??
  "https://docs.google.com/spreadsheets/d/1aLwM2E2FZoIP-_9Gp7DZ7-j1q5QPn_b4/edit?usp=sharing&ouid=105020359161972775426&rtpof=true&sd=true";
export const DEFAULT_BOOTSTRAP_RECORD_FLOOR = Number.parseInt(
  process.env.DEFAULT_BOOTSTRAP_RECORD_FLOOR ?? "37000",
  10,
);
export const LOCAL_WORKBOOK_PATH = process.env.LOCAL_WORKBOOK_PATH ?? "";
export const AUTO_BOOTSTRAP_STALE_MS = 12 * 60 * 1000;
