import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { Transform, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import Busboy from "busboy";
import { parsePublicGoogleDriveLink } from "./google-drive.js";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);
const DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com", "drive.usercontent.google.com"]);
const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

function safeName(name) {
  const leaf = basename(String(name || "video")).replace(/[\x00-\x1f\\/]/g, "_").trim();
  return leaf.slice(-180) || "video";
}

function naturalNumber(name) {
  const match = safeName(name).match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function signatureLooksLikeVideo(buffer, extension) {
  if (buffer.length < 12) return false;
  if (extension === ".mp4" || extension === ".mov" || extension === ".m4v") {
    return buffer.toString("ascii", 4, 8) === "ftyp";
  }
  if (extension === ".webm" || extension === ".mkv") {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  if (extension === ".avi") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "AVI ";
  return false;
}

async function hashFile(path) {
  const hash = createHash("sha256");
  let head = Buffer.alloc(0);
  let size = 0;
  const meter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (head.length < 64) head = Buffer.concat([head, chunk.subarray(0, 64 - head.length)]);
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  await pipeline((await import("node:fs")).createReadStream(path), meter, new Transform({ transform(chunk, enc, cb) { cb(); } }));
  return { sha256: hash.digest("hex"), size, head };
}

async function persistAsset({ tempPath, name, sourceType, sourceReference, directory, database, maxBytes }) {
  const extension = extname(name).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(extension)) throw Object.assign(new Error("Formato de vídeo não permitido."), { statusCode: 415 });
  const info = await hashFile(tempPath);
  if (!info.size || info.size > maxBytes) throw Object.assign(new Error("Arquivo vazio ou acima do limite permitido."), { statusCode: 413 });
  if (!signatureLooksLikeVideo(info.head, extension)) throw Object.assign(new Error("O conteúdo do arquivo não corresponde a um formato de vídeo aceito."), { statusCode: 415 });
  const finalName = randomUUID() + extension;
  const finalPath = join(directory, finalName);
  await rename(tempPath, finalPath);
  try {
    const result = await database.query(
      `INSERT INTO media_assets
        (source_type, source_reference, original_name, storage_reference, mime_type, file_size_bytes, sha256, natural_sort_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, source_type, original_name, file_size_bytes, sha256, natural_sort_number, status, created_at`,
      [sourceType, sourceReference, safeName(name), "local://" + finalName,
       extension === ".webm" ? "video/webm" : extension === ".mov" ? "video/quicktime" : extension === ".avi" ? "video/x-msvideo" : "video/mp4",
       info.size, info.sha256, naturalNumber(name)]
    );
    return result.rows[0];
  } catch (error) {
    await rm(finalPath, { force: true });
    if (error.code === "23505") throw Object.assign(new Error("Este vídeo já existe na biblioteca."), { statusCode: 409 });
    throw error;
  }
}

async function downloadDriveFile(fileId, tempPath, maxBytes) {
  let url = "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(fileId);
  let response;
  for (let hop = 0; hop < 5; hop++) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !DRIVE_HOSTS.has(parsed.hostname) && !parsed.hostname.endsWith(".googleusercontent.com")) {
      throw Object.assign(new Error("O Google Drive redirecionou para um endereço não permitido."), { statusCode: 502 });
    }
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(60000), headers: { "user-agent": "TikTokAutoPublisher/0.1" } });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw Object.assign(new Error("Redirecionamento inválido do Google Drive."), { statusCode: 502 });
      url = new URL(location, url).toString();
      continue;
    }
    break;
  }
  if (!response || !response.ok || !response.body) {
    throw Object.assign(new Error("Não foi possível baixar o arquivo. Verifique se o link está público e se o Drive permite o download."), { statusCode: 422 });
  }
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("text/html") || type.includes("application/json")) {
    throw Object.assign(new Error("O Drive retornou uma página de confirmação ou erro, não o vídeo. O link pode exigir confirmação, permissão ou não permitir download direto."), { statusCode: 422 });
  }
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw Object.assign(new Error("O vídeo excede o limite de tamanho configurado."), { statusCode: 413 });
  let received = 0;
  const limiter = new Transform({
    transform(chunk, enc, callback) {
      received += chunk.length;
      if (received > maxBytes) callback(Object.assign(new Error("O vídeo excede o limite de tamanho configurado."), { statusCode: 413 }));
      else callback(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(tempPath, { flags: "wx" }));
}

export function createIngestionHandler({ database, env = process.env } = {}) {
  const directory = env.MEDIA_STORAGE_DIR || "./var/media";
  const maxBytes = Number(env.MAX_UPLOAD_BYTES || DEFAULT_MAX_BYTES);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024) throw new Error("MAX_UPLOAD_BYTES inválido.");
  return async function handleIngestion(request, response, pathname) {
    if (request.method === "POST" && pathname === "/api/media-assets/upload") {
      if (!database) { response.writeHead(503); response.end(JSON.stringify({ error: "database_not_configured" })); return true; }
      const contentType = request.headers["content-type"] || "";
      if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
        response.writeHead(415); response.end(JSON.stringify({ error: "multipart_required", message: "Envie o vídeo como multipart/form-data no campo video." })); return true;
      }
      await mkdir(directory, { recursive: true });
      const tempPath = join(directory, ".upload-" + randomUUID());
      let uploadName = "";
      let fileSeen = false;
      let tooLarge = false;
      let writeError = null;
      try {
        const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: maxBytes, fields: 0, parts: 1 } });
        const finished = new Promise((resolve, reject) => {
          parser.on("file", (field, stream, info) => {
            if (field !== "video" || fileSeen) { stream.resume(); reject(Object.assign(new Error("Envie somente um arquivo no campo video."), { statusCode: 400 })); return; }
            fileSeen = true;
            uploadName = safeName(info.filename);
            stream.on("limit", () => { tooLarge = true; });
            stream.on("error", error => { writeError = error; });
            stream.pipe(createWriteStream(tempPath, { flags: "wx" }).on("error", error => { writeError = error; }));
          });
          parser.on("filesLimit", () => reject(Object.assign(new Error("Somente um arquivo é permitido."), { statusCode: 400 })));
          parser.on("error", reject);
          parser.on("finish", resolve);
        });
        request.pipe(parser);
        await finished;
        if (writeError) throw writeError;
        if (!fileSeen) throw Object.assign(new Error("Nenhum arquivo foi enviado no campo video."), { statusCode: 400 });
        if (tooLarge) throw Object.assign(new Error("Arquivo acima do limite configurado."), { statusCode: 413 });
        const item = await persistAsset({ tempPath, name: uploadName, sourceType: "upload", sourceReference: null, directory, database, maxBytes });
        response.writeHead(201, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ item }));
      } catch (error) {
        await rm(tempPath, { force: true });
        throw error;
      }
      return true;
    }

    if (request.method === "POST" && pathname === "/api/media-assets/import-google-drive") {
      if (!database) { response.writeHead(503); response.end(JSON.stringify({ error: "database_not_configured" })); return true; }
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 16 * 1024) throw Object.assign(new Error("Requisição acima de 16 KB."), { statusCode: 413 });
      }
      let data;
      try { data = JSON.parse(body || "{}"); } catch { throw Object.assign(new Error("JSON inválido."), { statusCode: 400 }); }
      const parsed = parsePublicGoogleDriveLink(data.url);
      await mkdir(directory, { recursive: true });
      const tempPath = join(directory, ".drive-" + randomUUID());
      try {
        await downloadDriveFile(parsed.fileId, tempPath, maxBytes);
        const name = safeName(data.filename || parsed.fileId + ".mp4");
        const item = await persistAsset({ tempPath, name, sourceType: "google_drive", sourceReference: parsed.shareUrl, directory, database, maxBytes });
        response.writeHead(201, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ item }));
      } catch (error) {
        await rm(tempPath, { force: true });
        throw error;
      }
      return true;
    }
    return false;
  };
}
