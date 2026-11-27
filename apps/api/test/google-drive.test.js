import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicGoogleDriveLink } from "../src/google-drive.js";

test("parses a shared Google Drive file link", () => {
  const result = parsePublicGoogleDriveLink("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing");
  assert.equal(result.fileId, "1AbCdEfGhIjKlMnOp");
  assert.equal(result.downloadUrl, "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp");
});

test("parses the Google Drive open?id link format", () => {
  const result = parsePublicGoogleDriveLink("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp");
  assert.equal(result.fileId, "1AbCdEfGhIjKlMnOp");
});

test("rejects non-Google hosts and non-HTTPS links", () => {
  assert.throws(() => parsePublicGoogleDriveLink("https://example.com/file/d/1AbCdEfGhIjKlMnOp"));
  assert.throws(() => parsePublicGoogleDriveLink("http://drive.google.com/file/d/1AbCdEfGhIjKlMnOp"));
});

test("rejects malformed Drive links", () => {
  assert.throws(() => parsePublicGoogleDriveLink("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp"));
  assert.throws(() => parsePublicGoogleDriveLink(""));
});
