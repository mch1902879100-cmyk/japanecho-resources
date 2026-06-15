import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildResourceRecord } from './resource-pack-core.mjs';

const releaseRoot = path.resolve(import.meta.dirname, '..');
const baseRoot = path.resolve(releaseRoot, '..');
const albumsRoot = path.join(baseRoot, '03_输出文件', 'albums');
const ffmpeg = path.join(baseRoot, '02_本地TTS引擎', 'GPT-SoVITS-Inference', 'ffmpeg.exe');
const buildRoot = path.join(releaseRoot, 'build', 'pilot-emily-playback');
const packsRoot = path.join(releaseRoot, 'packs');
const resourcesPath = path.join(releaseRoot, 'resources.json');
const config = JSON.parse(await fs.readFile(path.join(releaseRoot, 'release-config.json'), 'utf8'));

const TARGET_ID = 'emily-dickinson-poem-002';
const PACK_ID = 'pilot-emily-dickinson-playback';
const VERSION = '1.0.0';
const FILE_NAME = `${PACK_ID}-v${VERSION}.jepack`;

const findAlbumDir = async () => {
  for (const entry of await fs.readdir(albumsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(albumsRoot, entry.name);
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
      if (manifest.id === TARGET_ID) return { dir, manifest };
    } catch {
      // Ignore incomplete historical folders.
    }
  }
  throw new Error(`Album not found: ${TARGET_ID}`);
};

const run = (command, args) => {
  const result = spawnSync(command, args, { windowsHide: true, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
};

const sha256 = async (file) =>
  crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');

const main = async () => {
  await fs.access(ffmpeg);
  const { dir: sourceDir, manifest } = await findAlbumDir();
  const sourceSegments = JSON.parse(await fs.readFile(path.join(sourceDir, 'segments.json'), 'utf8'));
  const readySegments = sourceSegments.filter((segment) => segment.isReady && segment.audioJP && segment.audioCN);
  if (!readySegments.length) throw new Error(`${TARGET_ID} has no playable segments`);

  await fs.rm(buildRoot, { recursive: true, force: true });
  const albumRelative = `albums/${TARGET_ID}`;
  const albumRoot = path.join(buildRoot, albumRelative);
  await fs.mkdir(path.join(albumRoot, 'audio'), { recursive: true });

  const converted = [];
  for (const segment of readySegments) {
    const next = { ...segment };
    for (const field of ['audioJP', 'audioCN']) {
      const sourceRelative = String(segment[field]).replaceAll('\\', '/');
      const outputRelative = sourceRelative.replace(/\.[^.]+$/i, '.mp3');
      const source = path.join(sourceDir, sourceRelative);
      const output = path.join(albumRoot, outputRelative);
      await fs.mkdir(path.dirname(output), { recursive: true });
      run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-ac', '1', '-b:a', '96k', output]);
      next[field] = outputRelative;
    }
    converted.push(next);
  }

  const albumManifest = {
    ...manifest,
    resourcePackId: PACK_ID,
    resourcePackVersion: VERSION,
    albumPath: albumRelative,
    segmentCount: converted.length,
    readyCount: converted.length,
  };
  await fs.writeFile(path.join(albumRoot, 'manifest.json'), JSON.stringify(albumManifest, null, 2), 'utf8');
  await fs.writeFile(path.join(albumRoot, 'segments.json'), JSON.stringify(converted, null, 2), 'utf8');

  const item = {
    id: TARGET_ID,
    slug: TARGET_ID,
    title: manifest.title,
    author: manifest.author,
    readyCount: converted.length,
    segmentCount: converted.length,
    coverUrl: manifest.coverUrl || '',
    albumPath: albumRelative,
  };
  const fragment = {
    schemaVersion: 1,
    shelf: { id: 'en', title: '英语书架', language: 'en' },
    section: { id: 'en-poetry', title: '诗歌鉴赏' },
    collection: {
      id: 'collection-emily-dickinson-pilot',
      title: 'Emily Dickinson / 艾米莉·狄金森 云端试听集',
      author: 'Emily Dickinson / 艾米莉·狄金森',
      itemType: '诗歌',
      description: '云端播放资源实验包',
      items: [item],
    },
  };
  await fs.writeFile(path.join(buildRoot, 'catalog-fragment.json'), JSON.stringify(fragment, null, 2), 'utf8');
  await fs.writeFile(path.join(buildRoot, 'pack-manifest.json'), JSON.stringify({
    schemaVersion: 2,
    id: PACK_ID,
    version: VERSION,
    title: fragment.collection.title,
    author: fragment.collection.author,
    language: 'en',
    contentType: 'audio',
    kind: 'playback',
    mobileVisible: true,
    includesAudio: true,
    albumIds: [TARGET_ID],
    albumCount: 1,
    installRoot: 'japanecho-resources',
    catalogFragment: 'catalog-fragment.json',
    createdAt: new Date().toISOString(),
  }, null, 2), 'utf8');

  await fs.mkdir(packsRoot, { recursive: true });
  const zipPath = path.join(packsRoot, `${FILE_NAME}.zip`);
  const packPath = path.join(packsRoot, FILE_NAME);
  await fs.rm(zipPath, { force: true });
  await fs.rm(packPath, { force: true });
  run('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${buildRoot.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -CompressionLevel Optimal -Force`,
  ]);
  await fs.rename(zipPath, packPath);

  const stat = await fs.stat(packPath);
  if (stat.size > 250 * 1024 * 1024) throw new Error('Pilot pack exceeds 250 MB');
  const resource = buildResourceRecord({
    id: PACK_ID,
    version: VERSION,
    title: fragment.collection.title,
    author: fragment.collection.author,
    language: 'en',
    section: fragment.section.title,
    albumIds: [TARGET_ID],
    size: stat.size,
    sha256: await sha256(packPath),
    fileName: FILE_NAME,
    repository: config.repository,
  });

  const index = JSON.parse(await fs.readFile(resourcesPath, 'utf8'));
  index.schemaVersion = 2;
  index.updatedAt = new Date().toISOString();
  index.resources = [...index.resources.filter((entry) => entry.id !== PACK_ID), resource];
  await fs.writeFile(resourcesPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(`Built ${FILE_NAME}: ${converted.length} segments, ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
