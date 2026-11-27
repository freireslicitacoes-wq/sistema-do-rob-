const ALLOWED_HOSTS = new Set(["drive.google.com", "www.drive.google.com"]);

export function parsePublicGoogleDriveLink(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Informe o link compartilhado do Google Drive.");
  }
  let url;
  try { url = new URL(value.trim()); }
  catch { throw new TypeError("O link informado não é uma URL válida."); }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new TypeError("Use um link HTTPS compartilhado do Google Drive.");
  }

  let fileId = null;
  const pathMatch = url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{10,})\/?$/);
  if (pathMatch) fileId = pathMatch[1];
  if (!fileId && url.pathname === "/open") {
    const queryId = url.searchParams.get("id");
    if (queryId && /^[a-zA-Z0-9_-]{10,}$/.test(queryId)) fileId = queryId;
  }
  if (!fileId) {
    throw new TypeError("Não consegui identificar o arquivo nesse link do Google Drive.");
  }
  return {
    fileId,
    shareUrl: "https://drive.google.com/file/d/" + fileId + "/view",
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(fileId)
  };
}
