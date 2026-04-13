import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "@/lib/env";
import type { CatalogSourceDocument, CatalogSourceRow, CatalogSourceState } from "@/lib/catalog/types";

type GitHubContentMetadata = {
  sha?: string;
};

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isGitHubCatalogSyncEnabled() {
  return Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO_OWNER && env.GITHUB_REPO_NAME);
}

function getLocalCatalogSourcePath() {
  return resolve(process.cwd(), env.CATALOG_SOURCE_PATH);
}

function normalizeCatalogSourceDocument(raw: unknown): CatalogSourceDocument {
  if (Array.isArray(raw)) {
    return {
      format: "bryozoo-import-json-v1",
      sheetName: "ALL",
      headers: [],
      rows: raw as CatalogSourceRow[],
    };
  }

  const object = asObject(raw);

  if (!object || !Array.isArray(object.rows)) {
    throw new Error("The catalog source JSON must contain a top-level rows array.");
  }

  return {
    format: typeof object.format === "string" ? object.format : "bryozoo-import-json-v1",
    sourceFormat: typeof object.sourceFormat === "string" ? object.sourceFormat : undefined,
    originalFileName:
      typeof object.originalFileName === "string" ? object.originalFileName : undefined,
    sheetName: typeof object.sheetName === "string" ? object.sheetName : "ALL",
    sourceHash: typeof object.sourceHash === "string" ? object.sourceHash : undefined,
    totalRows: typeof object.totalRows === "number" ? object.totalRows : undefined,
    headers: Array.isArray(object.headers)
      ? object.headers.filter((entry): entry is string => typeof entry === "string")
      : [],
    rows: object.rows as CatalogSourceRow[],
  };
}

export function getCatalogRowMetadata(row: CatalogSourceRow) {
  const archivedValue = (row as { __archived?: unknown }).__archived;

  return {
    id: typeof row.__catalogId === "string" && row.__catalogId.trim().length > 0 ? row.__catalogId : null,
    archived:
      archivedValue === true ||
      (typeof archivedValue === "string" && archivedValue.toLowerCase() === "true"),
    createdAt:
      typeof row.__createdAt === "string" && row.__createdAt.trim().length > 0
        ? row.__createdAt
        : null,
    updatedAt:
      typeof row.__updatedAt === "string" && row.__updatedAt.trim().length > 0
        ? row.__updatedAt
        : null,
  };
}

export function stripCatalogRowMetadata(row: CatalogSourceRow) {
  const next = { ...row };
  delete next.__catalogId;
  delete next.__archived;
  delete next.__createdAt;
  delete next.__updatedAt;
  return next;
}

export function withCatalogRowMetadata(
  row: Record<string, string>,
  metadata: {
    id: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
  },
): CatalogSourceRow {
  return {
    ...row,
    __catalogId: metadata.id,
    __archived: metadata.archived ? "true" : "false",
    __createdAt: metadata.createdAt,
    __updatedAt: metadata.updatedAt,
  };
}

export function createCatalogId(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 24);
}

export function createCatalogSourceHash(document: CatalogSourceDocument) {
  return createHash("sha1").update(JSON.stringify(document.rows)).digest("hex");
}

async function readLocalCatalogSourceDocument(): Promise<CatalogSourceState> {
  const localPath = getLocalCatalogSourcePath();
  const raw = await readFile(localPath, "utf8");
  const document = normalizeCatalogSourceDocument(JSON.parse(raw.replace(/^\uFEFF/, "")));

  return {
    document,
    mode: "local",
    sha: createHash("sha1").update(raw).digest("hex"),
  };
}

function getGitHubContentsUrl() {
  return new URL(
    `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${env.CATALOG_SOURCE_PATH}`,
  );
}

function getGitHubHeaders(accept: string) {
  return {
    Accept: accept,
    Authorization: `Bearer ${env.GITHUB_TOKEN!}`,
    "User-Agent": "BryoZoo catalog editor",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readGitHubCatalogSourceDocument(): Promise<CatalogSourceState> {
  const metadataUrl = getGitHubContentsUrl();
  metadataUrl.searchParams.set("ref", env.GITHUB_REPO_BRANCH);

  const metadataResponse = await fetch(metadataUrl, {
    headers: getGitHubHeaders("application/vnd.github.object+json"),
    cache: "no-store",
  });

  if (!metadataResponse.ok) {
    throw new Error(`Could not read catalog source metadata from GitHub (${metadataResponse.status}).`);
  }

  const metadata = (await metadataResponse.json()) as GitHubContentMetadata;
  const contentResponse = await fetch(metadataUrl, {
    headers: getGitHubHeaders("application/vnd.github.raw+json"),
    cache: "no-store",
  });

  if (!contentResponse.ok) {
    throw new Error(`Could not read catalog source from GitHub (${contentResponse.status}).`);
  }

  const raw = await contentResponse.text();
  const document = normalizeCatalogSourceDocument(JSON.parse(raw.replace(/^\uFEFF/, "")));

  return {
    document,
    mode: "github",
    sha: metadata.sha ?? null,
  };
}

export async function readCatalogSourceState(options?: { preferRemote?: boolean }) {
  if (options?.preferRemote && isGitHubCatalogSyncEnabled()) {
    return readGitHubCatalogSourceDocument();
  }

  return readLocalCatalogSourceDocument();
}

export async function writeLocalCatalogSourceDocument(document: CatalogSourceDocument) {
  const localPath = getLocalCatalogSourcePath();
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

async function writeGitHubCatalogSourceDocument(
  document: CatalogSourceDocument,
  sha: string | null,
  message: string,
) {
  const url = getGitHubContentsUrl();
  const body = {
    message,
    branch: env.GITHUB_REPO_BRANCH,
    content: Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8").toString("base64"),
    ...(sha ? { sha } : {}),
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...getGitHubHeaders("application/vnd.github+json"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const messageText = await response.text();
    throw new Error(`GitHub catalog update failed (${response.status}): ${messageText}`);
  }
}

export async function saveCatalogSourceState(
  state: CatalogSourceState,
  document: CatalogSourceDocument,
  message: string,
) {
  if (state.mode === "github" && isGitHubCatalogSyncEnabled()) {
    await writeGitHubCatalogSourceDocument(document, state.sha, message);
    return;
  }

  await writeLocalCatalogSourceDocument(document);
}
