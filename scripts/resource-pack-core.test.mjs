import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResourceRecord, splitByMaxBytes } from './resource-pack-core.mjs';

test('builds mobile-visible playback metadata', () => {
  const resource = buildResourceRecord({
    id: 'pilot',
    version: '1.0.0',
    title: 'Pilot',
    author: 'Author',
    language: 'en',
    section: 'Poetry',
    albumIds: ['album-1'],
    size: 42,
    sha256: 'abc',
    fileName: 'pilot.jepack',
    repository: 'owner/repo',
  });

  assert.equal(resource.kind, 'playback');
  assert.equal(resource.mobileVisible, true);
  assert.equal(resource.includesAudio, true);
  assert.deepEqual(resource.albumIds, ['album-1']);
});

test('splits items before exceeding the byte limit', () => {
  const items = [{ id: 'a', size: 200 }, { id: 'b', size: 100 }];
  assert.deepEqual(splitByMaxBytes(items, 250), [[items[0]], [items[1]]]);
});
