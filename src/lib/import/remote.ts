type RemoteWorkbookSource = {
  sourceUrl: URL;
  downloadUrl: URL;
  fileName: string;
};

function parsePublicUrl(raw: string) {
  if (raw.trim().length === 0) {
    throw new Error("Paste the public URL of the Excel workbook.");
  }

  let url: URL;

  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("The workbook URL is not valid.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("The workbook URL must start with http:// or https://.");
  }

  return url;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function getFileNameFromUrl(url: URL) {
  const fromPath = decodeURIComponent(url.pathname.split("/").at(-1) ?? "").trim();
  return sanitizeFileName(fromPath || "remote-workbook.xlsx");
}

function extractGoogleSheetsId(url: URL) {
  if (url.hostname !== "docs.google.com") {
    return undefined;
  }

  const match = url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([^/]+)/i);
  return match?.[1];
}

function extractGoogleDriveFileId(url: URL) {
  if (url.hostname !== "drive.google.com") {
    return undefined;
  }

  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);

  if (fileMatch?.[1]) {
    return fileMatch[1];
  }

  const queryId = url.searchParams.get("id");
  return queryId?.trim() ? queryId : undefined;
}

function getFallbackFileName(url: URL) {
  const googleSheetsId = extractGoogleSheetsId(url);

  if (googleSheetsId) {
    return `google-sheet-${googleSheetsId}.xlsx`;
  }

  const googleDriveFileId = extractGoogleDriveFileId(url);

  if (googleDriveFileId) {
    return `google-drive-${googleDriveFileId}.xlsx`;
  }

  return getFileNameFromUrl(url);
}

function normalizeWorkbookUrl(sourceUrl: URL): RemoteWorkbookSource {
  const googleSheetsId = extractGoogleSheetsId(sourceUrl);

  if (googleSheetsId) {
    return {
      sourceUrl,
      downloadUrl: new URL(
        `https://docs.google.com/spreadsheets/d/${googleSheetsId}/export?format=xlsx`,
      ),
      fileName: `google-sheet-${googleSheetsId}.xlsx`,
    };
  }

  const googleDriveFileId = extractGoogleDriveFileId(sourceUrl);

  if (googleDriveFileId) {
    return {
      sourceUrl,
      downloadUrl: new URL(`https://drive.google.com/uc?export=download&id=${googleDriveFileId}`),
      fileName: `google-drive-${googleDriveFileId}.xlsx`,
    };
  }

  return {
    sourceUrl,
    downloadUrl: sourceUrl,
    fileName: getFallbackFileName(sourceUrl),
  };
}

function parseContentDispositionFileName(header: string | null) {
  if (!header) {
    return undefined;
  }

  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return sanitizeFileName(decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, "")));
  }

  const plainMatch = header.match(/filename\s*=\s*"?(?:[^";]+)"?/i);
  const plainName = plainMatch?.[0]
    ?.replace(/filename\s*=\s*/i, "")
    .replace(/^"|"$/g, "")
    .trim();
  return plainName ? sanitizeFileName(plainName) : undefined;
}

function resolveFileName(response: Response, fallback: string) {
  const fromHeader = parseContentDispositionFileName(response.headers.get("content-disposition"));

  if (fromHeader) {
    return fromHeader;
  }

  const fromResponseUrl = getFileNameFromUrl(new URL(response.url));

  if (fromResponseUrl !== "remote-workbook.xlsx") {
    return fromResponseUrl;
  }

  return fallback;
}

function looksLikeHtml(buffer: Buffer, response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    return true;
  }

  const preview = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  return preview.startsWith("<!doctype html") || preview.startsWith("<html");
}

export function resolveRemoteWorkbookSource(rawUrl: string) {
  return normalizeWorkbookUrl(parsePublicUrl(rawUrl));
}

export async function downloadRemoteWorkbook(rawUrl: string) {
  const source = resolveRemoteWorkbookSource(rawUrl);
  const response = await fetch(source.downloadUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "BryoZoo import bot",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Could not download the workbook (${response.status} ${response.statusText}).`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("The downloaded workbook is empty.");
  }

  if (looksLikeHtml(buffer, response)) {
    throw new Error(
      "The URL returned an HTML page instead of an Excel file. Paste a public .xlsx link or a public Google Sheets share link.",
    );
  }

  return {
    buffer,
    fileName: resolveFileName(response, source.fileName),
    source,
  };
}
