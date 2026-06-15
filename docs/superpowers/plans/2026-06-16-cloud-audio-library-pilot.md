# Cloud Audio Library Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a small end-to-end pilot containing the approved seven APK-bundled works plus one downloadable MP3 playback pack, with clear `内置` and `已下载` mobile labels.

**Architecture:** The release workspace owns inventory, audio conversion, JEPACK creation, validation, and GitHub publication. The mobile app owns the bundled-work whitelist, resource catalog filtering, duplicate resolution, and source badges. The pilot uses one small downloadable collection so the complete flow can be tested before processing all audio.

**Tech Stack:** Node.js ES modules, Vitest, PowerShell, portable FFmpeg, GitHub Releases, React, Capacitor Filesystem, JSZip.

---

### Task 1: Add testable resource metadata and merge rules

**Files:**
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\src\resourcePacks.ts`
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\src\resourcePacks.test.ts`

- [ ] **Step 1: Write failing tests for visibility and bundled precedence**

Add tests proving:

```ts
expect(visibleMobileResources(resources).map((item) => item.id)).toEqual(['playback-pack']);
expect(mergeAlbumsPreferBundled([bundled], [downloaded])).toEqual([bundled]);
expect(albumSourceLabel(bundled)).toBe('内置');
expect(albumSourceLabel(downloaded)).toBe('已下载');
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```powershell
npm test -- src/resourcePacks.test.ts
```

Expected: FAIL because the new helpers and metadata fields do not exist.

- [ ] **Step 3: Implement the minimal resource helpers**

Extend `RemoteResource` with:

```ts
kind: 'playback' | 'backup';
mobileVisible: boolean;
albumIds: string[];
```

Add pure helpers:

```ts
export const visibleMobileResources = (resources: RemoteResource[]) =>
  resources.filter((resource) => resource.kind === 'playback' && resource.mobileVisible);

export const mergeAlbumsPreferBundled = <T extends { id: string }>(bundled: T[], downloaded: T[]) => {
  const bundledIds = new Set(bundled.map((album) => album.id));
  return [...bundled, ...downloaded.filter((album) => !bundledIds.has(album.id))];
};

export const albumSourceLabel = (album: { resourcePackId?: string }) =>
  album.resourcePackId ? '已下载' : '内置';
```

- [ ] **Step 4: Run focused tests and verify they pass**

Run:

```powershell
npm test -- src/resourcePacks.test.ts
```

Expected: all resource pack tests PASS.

- [ ] **Step 5: Commit the release-workspace plan checkpoint**

The mobile folder currently has no Git repository, so preserve its changes through verification and the final APK artifact. Commit only release-workspace changes in later tasks.

### Task 2: Fix the APK bundled-work whitelist

**Files:**
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\scripts\copy-cache.mjs`
- Create: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\scripts\verify-bundled-albums.mjs`
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\package.json`

- [ ] **Step 1: Write a failing bundled-content verifier**

Create a verifier that reads `public/albums/albums.json` and requires exactly:

```js
[
  'tadoku-reader-005',
  'tadoku-reader-009',
  'nankichi-story-009',
  'classic-miyazawa-07-7',
  'emily-dickinson-poem-001',
  'emily-dickinson-poem-006',
  'emily-dickinson-poem-009',
]
```

- [ ] **Step 2: Run the verifier and verify it fails**

Run:

```powershell
node scripts/verify-bundled-albums.mjs
```

Expected: FAIL because the current copy script includes a broader author-prefix selection.

- [ ] **Step 3: Replace prefix selection with the fixed ID whitelist**

Use a `Set` named `BUNDLED_ALBUM_IDS` and make `shouldInclude()` require membership and `readyCount > 0`.

- [ ] **Step 4: Rebuild bundled content and run the verifier**

Run:

```powershell
npm run copy-cache
node scripts/verify-bundled-albums.mjs
```

Expected: exactly seven bundled albums PASS.

### Task 3: Build a pilot playback JEPACK

**Files:**
- Create: `E:\合成测试\04_Japanecho资源发布\scripts\resource-pack-core.mjs`
- Create: `E:\合成测试\04_Japanecho资源发布\scripts\resource-pack-core.test.mjs`
- Create: `E:\合成测试\04_Japanecho资源发布\scripts\build-pilot-playback-pack.mjs`
- Modify: `E:\合成测试\04_Japanecho资源发布\scripts\verify-resource-packs.mjs`
- Modify: `E:\合成测试\04_Japanecho资源发布\resources.json`

- [ ] **Step 1: Write failing tests for resource metadata and splitting**

Use Node's built-in test runner to prove:

```js
assert.equal(buildResourceRecord(input).kind, 'playback');
assert.equal(buildResourceRecord(input).mobileVisible, true);
assert.deepEqual(buildResourceRecord(input).albumIds, ['tadoku-reader-001']);
assert.deepEqual(splitByMaxBytes(items, 250), [[items[0]], [items[1]]]);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node --test scripts/resource-pack-core.test.mjs
```

Expected: FAIL because `resource-pack-core.mjs` does not exist.

- [ ] **Step 3: Implement the pure pack helpers**

Implement metadata construction, byte-size grouping, SHA-256, and catalog-index merging without filesystem side effects.

- [ ] **Step 4: Add portable FFmpeg bootstrap and pilot conversion**

The pilot builder must:

- locate `tools/ffmpeg/bin/ffmpeg.exe`;
- download and extract a portable Windows FFmpeg build only when absent;
- select one small non-bundled playable collection;
- convert its source audio to 96 kbps mono MP3;
- rewrite `segments.json` audio paths to MP3;
- create one JEPACK with `kind: playback`, `mobileVisible: true`, and `albumIds`;
- retain existing catalog entries instead of replacing them.

- [ ] **Step 5: Build and validate the pilot pack**

Run:

```powershell
node scripts/build-pilot-playback-pack.mjs
node --test scripts/resource-pack-core.test.mjs
node scripts/verify-resource-packs.mjs
```

Expected: one pilot audio JEPACK is created, all checks pass, and no pack exceeds 250 MB.

### Task 4: Show only installable playback packs and source badges

**Files:**
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\src\main.tsx`
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\src\styles.css`
- Modify: `E:\合成测试\01_Japanecho项目\Japanecho-Mobile-Player\src\resourcePacks.test.ts`

- [ ] **Step 1: Add failing tests for catalog filtering and duplicate suppression**

Test that backup packs are absent from resource-center data and that installed copies never replace bundled albums with the same ID.

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```powershell
npm test -- src/resourcePacks.test.ts
```

Expected: FAIL until `main.tsx` uses the new helpers.

- [ ] **Step 3: Wire helpers into the mobile UI**

Change library loading to `mergeAlbumsPreferBundled`, resource-center loading to `visibleMobileResources`, and album cards to render:

```tsx
<span className={`source-badge ${album.resourcePackId ? 'downloaded' : 'bundled'}`}>
  {albumSourceLabel(album)}
</span>
```

Use green for `内置` and purple for `已下载`.

- [ ] **Step 4: Run tests and build the mobile app**

Run:

```powershell
npm test
npm run build
node scripts/verify-mobile-lite.mjs
```

Expected: tests PASS, production build succeeds, and mobile-lite verification succeeds.

### Task 5: Publish and verify the pilot end to end

**Files:**
- Modify: `E:\合成测试\04_Japanecho资源发布\scripts\publish-release.ps1`
- Modify: `E:\合成测试\04_Japanecho资源发布\README.md`

- [ ] **Step 1: Ensure publication uploads both catalog and new pilot JEPACK**

Keep backup packages out of the mobile-visible resource list while still allowing them to be Release assets in later full publication.

- [ ] **Step 2: Verify the local catalog and pack before upload**

Run:

```powershell
node scripts/verify-resource-packs.mjs
```

Expected: all local resources PASS size, SHA-256, manifest, and album-path checks.

- [ ] **Step 3: Publish the pilot**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/publish-release.ps1
```

Expected: GitHub Release upload succeeds and the latest catalog URL remains reachable.

- [ ] **Step 4: Build the debug APK**

Run:

```powershell
npm run apk:debug
```

Expected: Android debug APK build succeeds.

- [ ] **Step 5: Perform final verification**

Verify:

- the APK contains exactly seven built-in works;
- the resource center shows the pilot pack but no backup pack;
- built-in cards show `内置`;
- installing the pilot makes its cards appear with `已下载`;
- uninstalling the pilot removes only downloaded cards;
- at least one original and one Chinese MP3 segment play.

- [ ] **Step 6: Commit release workspace changes**

Run:

```powershell
git add docs scripts resources.json README.md
git commit -m "add cloud audio library pilot"
```
