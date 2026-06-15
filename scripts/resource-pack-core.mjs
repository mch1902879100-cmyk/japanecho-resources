export const splitByMaxBytes = (items, maxBytes) => {
  const groups = [];
  let group = [];
  let groupSize = 0;
  for (const item of items) {
    if (group.length && groupSize + item.size > maxBytes) {
      groups.push(group);
      group = [];
      groupSize = 0;
    }
    group.push(item);
    groupSize += item.size;
  }
  if (group.length) groups.push(group);
  return groups;
};

export const buildResourceRecord = ({
  id,
  version,
  title,
  author,
  language,
  section,
  albumIds,
  size,
  sha256,
  fileName,
  repository,
}) => ({
  id,
  version,
  title,
  author,
  language,
  section,
  contentType: 'audio',
  kind: 'playback',
  mobileVisible: true,
  includesAudio: true,
  albumIds,
  albumCount: albumIds.length,
  size,
  sha256,
  fileName,
  downloadUrl: `https://github.com/${repository}/releases/download/resources-v${version}/${fileName}`,
  requiresAppVersion: '0.1.0',
});
