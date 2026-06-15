import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const resources = JSON.parse(await fs.readFile(path.join(root, "resources.json"), "utf8"));
if (!resources.resources?.length) throw new Error("resources.json contains no packs");

for (const resource of resources.resources) {
  const packPath = path.join(root, "packs", resource.fileName);
  const bytes = await fs.readFile(packPath);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (hash !== resource.sha256) throw new Error(`${resource.id}: SHA-256 mismatch`);
  if (bytes.length !== resource.size) throw new Error(`${resource.id}: size mismatch`);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jepack-"));
  const zipPath = path.join(tempRoot, "pack.zip");
  await fs.copyFile(packPath, zipPath);
  const result = spawnSync("powershell.exe", [
    "-NoProfile", "-Command",
    `Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${tempRoot.replaceAll("'", "''")}\\contents' -Force`,
  ], { windowsHide: true, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${resource.id}: cannot extract`);
  const contents = path.join(tempRoot, "contents");
  const manifest = JSON.parse(await fs.readFile(path.join(contents, "pack-manifest.json"), "utf8"));
  const fragment = JSON.parse(await fs.readFile(path.join(contents, "catalog-fragment.json"), "utf8"));
  if (manifest.id !== resource.id) throw new Error(`${resource.id}: manifest id mismatch`);
  if (manifest.albumCount !== fragment.collection.items.length) throw new Error(`${resource.id}: album count mismatch`);
  for (const item of fragment.collection.items) {
    if (path.isAbsolute(item.albumPath)) throw new Error(`${resource.id}: absolute album path leaked`);
    await fs.access(path.join(contents, item.albumPath, "manifest.json"));
    await fs.access(path.join(contents, item.albumPath, "segments.json"));
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
  console.log(`Verified ${resource.id}: ${manifest.albumCount} albums, ${(bytes.length / 1024 / 1024).toFixed(2)} MB`);
}

