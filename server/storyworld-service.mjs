import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {
  buildCharacterProfileDocument,
  mapProfileDocumentToCharacter,
} from './character-profile-service.mjs';

const VALID_IDENTIFIER = /^[A-Za-z0-9_-]{2,64}$/;
const YAML_EXT_RE = /\.(yaml|yml)$/i;
const JSON_EXT_RE = /\.json$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;
const HF_DATASET_REPO = 'venetanji/polyu-storyworld-characters';
const HF_DATASET_API_ROOT = `https://huggingface.co/api/datasets/${HF_DATASET_REPO}/tree/main`;
const HF_DATASET_RESOLVE_ROOT = `https://huggingface.co/datasets/${HF_DATASET_REPO}/resolve/main`;

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'saves',
]);

const cache = {
  localIndex: { ts: 0, entries: [] },
  localContextByFile: new Map(),
  remoteIndex: { ts: 0, entries: [] },
  remotePortraitIndexByCode: new Map(),
};

const normalizeIdentifier = (value) => {
  const text = String(value || '').trim();
  if (!text || !VALID_IDENTIFIER.test(text)) return null;
  return text;
};

const normalizeQuery = (value) => {
  const text = String(value || '').trim();
  if (!text || text.length > 128) return null;
  return text;
};

const normalizeCode = (value) => {
  const normalized = normalizeIdentifier(value);
  return normalized ? normalized.toLowerCase() : null;
};

const toRelativePath = (root, absolutePath) => path.relative(root, absolutePath).replace(/\\/g, '/');

const getFilePriority = (filePath) => {
  if (JSON_EXT_RE.test(filePath)) return 3;
  if (YAML_EXT_RE.test(filePath)) return 1;
  return 0;
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const fileExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const getMimeTypeFromPath = (filePath) => {
  const ext = String(path.extname(filePath || '')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
};

const buildDataUrl = (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  return `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
};

const scorePortraitCandidate = (name) => {
  const text = String(name || '').toLowerCase();
  let score = 0;
  if (text.startsWith('portrait')) score += 100;
  if (/^1(\.|$)/.test(text)) score += 60;
  if (/^(a|cover|main)(\.|$)/.test(text)) score += 40;
  if (text.includes('character')) score += 20;
  if (text.endsWith('.png')) score += 8;
  if (text.endsWith('.jpg') || text.endsWith('.jpeg')) score += 6;
  if (text.endsWith('.webp')) score += 4;
  return score;
};

const selectPreferredImage = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => {
    const scoreDiff = scorePortraitCandidate(b?.name || b?.path) - scorePortraitCandidate(a?.name || a?.path);
    if (scoreDiff !== 0) return scoreDiff;
    const sizeDiff = Number(b?.size || 0) - Number(a?.size || 0);
    if (sizeDiff !== 0) return sizeDiff;
    return String(a?.name || a?.path || '').localeCompare(String(b?.name || b?.path || ''));
  });
  return sorted[0] || null;
};

const listImageFilesInDir = async (dir) => {
  if (!dir || !(await fileExists(dir))) return [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && IMAGE_EXT_RE.test(entry.name))
      .map((entry) => ({
        name: entry.name,
        path: path.join(dir, entry.name),
      }));
  } catch {
    return [];
  }
};

const getPresetCharacterDir = (rootDir) => path.join(rootDir, 'seeds', 'characters', 'presets');
const getAddedCharacterDir = (rootDir) => path.join(rootDir, 'seeds', 'characters', 'added');

const getPresetCharacterAssetDir = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getPresetCharacterDir(rootDir), normalized);
};

const getAddedCharacterAssetDir = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getAddedCharacterDir(rootDir), normalized);
};

const getPresetCharacterProfilePath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getPresetCharacterDir(rootDir), normalized, 'profile.json');
};

const getLegacyPresetCharacterProfilePath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getPresetCharacterDir(rootDir), `${normalized}.json`);
};

const getAddedCharacterProfilePath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getAddedCharacterDir(rootDir), normalized, 'profile.json');
};

const getAddedCharacterYamlPath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getAddedCharacterDir(rootDir), normalized, 'source.yaml');
};

const getLegacyAddedCharacterProfilePath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getAddedCharacterDir(rootDir), `${normalized}.json`);
};

const getLegacyAddedCharacterYamlPath = (rootDir, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return path.join(getAddedCharacterDir(rootDir), `${normalized}.yaml`);
};


const writeRemoteCharacterCache = async ({ rootDir, code, rawYaml }) => {
  const normalizedCode = normalizeCode(code);
  if (!rootDir || !normalizedCode || typeof rawYaml !== 'string' || !rawYaml.trim()) return null;

  const cacheDir = getAddedCharacterAssetDir(rootDir, normalizedCode);
  if (!cacheDir) return null;
  await ensureDir(cacheDir);

  const data = YAML.parse(rawYaml);
  const character = mapYamlToCharacter({
    data,
    code: normalizedCode,
    sourceType: 'remote',
    sourcePath: null,
    sourceUrl: null,
  });

  const targetFile = getAddedCharacterProfilePath(rootDir, normalizedCode);
  const yamlFile = getAddedCharacterYamlPath(rootDir, normalizedCode);
  const profileDoc = buildCharacterProfileDocument({ code: normalizedCode, character, preset: false });
  await fs.writeFile(yamlFile, rawYaml, 'utf8');
  await fs.writeFile(targetFile, `${JSON.stringify(profileDoc, null, 2)}\n`, 'utf8');

  // Remove legacy flat files after successful write to keep one canonical layout.
  const legacyProfileFile = getLegacyAddedCharacterProfilePath(rootDir, normalizedCode);
  const legacyYamlFile = getLegacyAddedCharacterYamlPath(rootDir, normalizedCode);
  if (legacyProfileFile && await fileExists(legacyProfileFile)) {
    await fs.rm(legacyProfileFile, { force: true });
  }
  if (legacyYamlFile && await fileExists(legacyYamlFile)) {
    await fs.rm(legacyYamlFile, { force: true });
  }

  cache.localIndex.ts = 0;
  cache.localContextByFile.delete(targetFile);
  cache.localContextByFile.delete(yamlFile);
  if (legacyProfileFile) cache.localContextByFile.delete(legacyProfileFile);
  if (legacyYamlFile) cache.localContextByFile.delete(legacyYamlFile);
  return targetFile;
};

const writeRemoteCharacterPortraitCache = async ({ rootDir, code, fileName, buffer }) => {
  const normalizedCode = normalizeCode(code);
  if (!rootDir || !normalizedCode || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  const cacheDir = getAddedCharacterAssetDir(rootDir, normalizedCode);
  if (!cacheDir) return null;
  await ensureDir(cacheDir);

  const sourceExt = path.extname(String(fileName || '')).toLowerCase();
  const ext = IMAGE_EXT_RE.test(sourceExt) ? sourceExt : '.png';
  const targetFile = path.join(cacheDir, `portrait${ext}`);
  const existingImages = await listImageFilesInDir(cacheDir);
  for (const entry of existingImages) {
    if (path.basename(entry.path) === path.basename(targetFile)) continue;
    if (path.basename(entry.path).toLowerCase().startsWith('portrait.')) {
      await fs.rm(entry.path, { force: true });
    }
  }

  await fs.writeFile(targetFile, buffer);
  return targetFile;
};

const loadLocalPortrait = async (rootDir, code) => {
  const normalizedCode = normalizeCode(code);
  if (!rootDir || !normalizedCode) return null;

  const candidateDirs = [
    getAddedCharacterAssetDir(rootDir, normalizedCode),
    getPresetCharacterAssetDir(rootDir, normalizedCode),
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    const images = await listImageFilesInDir(dir);
    const preferred = selectPreferredImage(images);
    if (!preferred?.path) continue;
    try {
      const buffer = await fs.readFile(preferred.path);
      const mimeType = getMimeTypeFromPath(preferred.path);
      return {
        path: toRelativePath(rootDir, preferred.path),
        url: null,
        mimeType,
        dataUrl: buildDataUrl(buffer, mimeType),
      };
    } catch {
      // try next candidate
    }
  }

  return null;
};

const buildRemotePortraitIndex = async (code) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return [];

  const now = Date.now();
  const cached = cache.remotePortraitIndexByCode.get(normalizedCode);
  if (cached && now - cached.ts < 5 * 60_000) {
    return cached.entries;
  }

  try {
    const response = await fetch(`${HF_DATASET_API_ROOT}/${normalizedCode}?recursive=true&expand=false`, {
      headers: {
        'User-Agent': 'mind-special-server',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      cache.remotePortraitIndexByCode.set(normalizedCode, { ts: now, entries: [] });
      return [];
    }

    const list = await response.json();
    const entries = Array.isArray(list)
      ? list
        .filter((item) => item?.type === 'file' && IMAGE_EXT_RE.test(item?.path || ''))
        .map((item) => ({
          name: path.basename(item.path),
          path: item.path,
          size: item.size || 0,
          url: `${HF_DATASET_RESOLVE_ROOT}/${item.path}`,
        }))
      : [];
    cache.remotePortraitIndexByCode.set(normalizedCode, { ts: now, entries });
    return entries;
  } catch {
    cache.remotePortraitIndexByCode.set(normalizedCode, { ts: now, entries: [] });
    return [];
  }
};

const fetchRemotePortraitByCode = async ({ rootDir, code, cacheRemote = false }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const remoteImages = await buildRemotePortraitIndex(normalizedCode);
  const preferred = selectPreferredImage(remoteImages);
  if (!preferred?.url) return null;

  try {
    const response = await fetch(preferred.url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = getMimeTypeFromPath(preferred.path);
    let localPath = null;
    if (cacheRemote && rootDir) {
      try {
        localPath = await writeRemoteCharacterPortraitCache({
          rootDir,
          code: normalizedCode,
          fileName: preferred.name,
          buffer,
        });
      } catch {
        // portrait cache write failure should not break main flow
      }
    }

    return {
      path: localPath ? toRelativePath(rootDir, localPath) : null,
      url: preferred.url,
      mimeType,
      dataUrl: buildDataUrl(buffer, mimeType),
    };
  } catch {
    return null;
  }
};

const enrichCharacterWithPortrait = async ({ rootDir, character, cacheRemote = false }) => {
  if (!character || typeof character !== 'object') return character;

  const existingDataUrl = String(character?.portrait?.dataUrl || '').trim();
  if (existingDataUrl) return character;

  const localPortrait = await loadLocalPortrait(rootDir, character.code);
  if (localPortrait) {
    return {
      ...character,
      portrait: localPortrait,
    };
  }

  const remotePortrait = await fetchRemotePortraitByCode({
    rootDir,
    code: character.code,
    cacheRemote,
  });
  if (remotePortrait) {
    return {
      ...character,
      portrait: remotePortrait,
    };
  }

  return character;
};

const findLocalProfileByCode = async (rootDir, code) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const profileCandidates = [
    getAddedCharacterProfilePath(rootDir, normalizedCode),
    getLegacyAddedCharacterProfilePath(rootDir, normalizedCode),
    getPresetCharacterProfilePath(rootDir, normalizedCode),
    getLegacyPresetCharacterProfilePath(rootDir, normalizedCode),
  ].filter(Boolean);

  for (const candidate of profileCandidates) {
    if (!(await fileExists(candidate))) continue;
    try {
      return await loadProfileCharacterFromFile(rootDir, candidate, normalizedCode);
    } catch {
      // try next profile candidate
    }
  }

  return null;
};

const parseNameList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[;,，、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getPathValue = (data, dottedPath) => {
  if (!data || typeof data !== 'object') return undefined;
  const parts = dottedPath.split('.');
  let cursor = data;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
};

const getFirstValue = (data, paths) => {
  for (const dottedPath of paths) {
    const value = getPathValue(data, dottedPath);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const normalizeCodeCandidate = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (VALID_IDENTIFIER.test(text)) return text.toLowerCase();
  return null;
};

const guessCodeFromFile = (filePath) => {
  const stem = path.basename(filePath, path.extname(filePath));
  const parent = path.basename(path.dirname(filePath));
  const stemCode = normalizeCodeCandidate(stem);
  if (stemCode) return stemCode;

  const parentCode = normalizeCodeCandidate(parent);
  if (parentCode) return parentCode;

  const match = stem.toLowerCase().match(/([0-9]{3,}[a-z]?)/);
  if (match) return match[1];
  return null;
};

const mapYamlToCharacter = ({ data, code, sourceType, sourcePath = null, sourceUrl = null }) => {
  const codeValue = normalizeCode(code) || normalizeCode(getFirstValue(data, ['code', 'id', 'character.code'])) || 'unknown';
  const displayName = String(getFirstValue(data, ['name', 'character.name', 'profile.name']) || codeValue).trim();
  const personalityValue = getFirstValue(data, [
    'personality',
    'character.personality',
    'profile.personality',
    'traits.personality',
  ]);
  const appearanceValue = getFirstValue(data, [
    'appearance',
    'character.appearance',
    'profile.appearance',
  ]);

  const dialogueTone = String(getFirstValue(data, [
    'dialogueStyle.tone',
    'dialogue.style',
    'voice.tone',
  ]) || '').trim();

  const dialogueFeatures = parseNameList(getFirstValue(data, [
    'dialogueStyle.features',
    'dialogue.features',
    'voice.features',
  ]));

  const openingLinesRaw = getFirstValue(data, [
    'initialDialogue',
    'dialogue.opening',
    'openingLines',
  ]);
  const openingLines = Array.isArray(openingLinesRaw)
    ? openingLinesRaw.map((line) => String(line || '').trim()).filter(Boolean)
    : [];

  return {
    code: codeValue,
    displayName,
    categoryId: String(getFirstValue(data, ['categoryId', 'category', 'character.category']) || '').trim() || null,
    profile: {
      name: displayName,
      age: getFirstValue(data, ['age', 'profile.age', 'character.age']) ?? null,
      personality: parseNameList(personalityValue),
      appearance: String(appearanceValue || '').trim(),
      occupation: String(getFirstValue(data, ['occupation', 'job', 'profile.occupation']) || '').trim(),
    },
    background: {
      backstory: String(getFirstValue(data, ['backstory', 'story', 'bio', 'character.backstory']) || '').trim(),
      origin: String(getFirstValue(data, ['origin', 'hometown', 'profile.origin']) || '').trim(),
    },
    dialogueStyle: {
      tone: dialogueTone,
      features: dialogueFeatures,
      openingLines,
    },
    source: {
      type: sourceType,
      path: sourcePath,
      url: sourceUrl,
    },
  };
};

const loadYamlCharacterFromFile = async (rootDir, filePath, codeHint = null) => {
  const stat = await fs.stat(filePath);
  const cached = cache.localContextByFile.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.character;
  }

  const raw = await fs.readFile(filePath, 'utf8');
  const data = YAML.parse(raw);
  const code = normalizeCode(codeHint) || guessCodeFromFile(filePath);
  const character = mapYamlToCharacter({
    data,
    code,
    sourceType: 'local',
    sourcePath: toRelativePath(rootDir, filePath),
  });

  cache.localContextByFile.set(filePath, { mtimeMs: stat.mtimeMs, character });
  return character;
};

const loadProfileCharacterFromFile = async (rootDir, filePath, codeHint = null) => {
  const stat = await fs.stat(filePath);
  const cached = cache.localContextByFile.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.character;
  }

  const raw = await fs.readFile(filePath, 'utf8');
  const doc = JSON.parse(raw);
  const code = normalizeCode(codeHint) || guessCodeFromFile(filePath);
  const character = mapProfileDocumentToCharacter({
    doc,
    code,
    sourcePath: toRelativePath(rootDir, filePath),
  });

  cache.localContextByFile.set(filePath, { mtimeMs: stat.mtimeMs, character });
  return character;
};

const loadCharacterFromFile = async (rootDir, filePath, codeHint = null) => {
  if (JSON_EXT_RE.test(filePath)) {
    return loadProfileCharacterFromFile(rootDir, filePath, codeHint);
  }
  return loadYamlCharacterFromFile(rootDir, filePath, codeHint);
};

const walkCharacterFiles = async (startDir) => {
  const stack = [startDir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(entryPath);
        }
        continue;
      }

      if (entry.isFile() && (YAML_EXT_RE.test(entry.name) || JSON_EXT_RE.test(entry.name))) {
        files.push(entryPath);
      }
    }
  }

  return files;
};

const buildLocalIndex = async (rootDir) => {
  const now = Date.now();
  if (now - cache.localIndex.ts < 30_000 && cache.localIndex.entries.length > 0) {
    return cache.localIndex.entries;
  }

  const candidateRoots = [
    getPresetCharacterDir(rootDir),
    getAddedCharacterDir(rootDir),
    path.join(rootDir, 'polyu-storyworld'),
    path.join(rootDir, 'story', 'repo'),
    path.join(rootDir, 'storyworld', 'repo'),
  ];

  const existingRoots = [];
  for (const dir of candidateRoots) {
    if (await fileExists(dir)) existingRoots.push(dir);
  }

  const entryByCode = new Map();
  const fallbackEntries = [];
  for (const baseDir of existingRoots) {
    const characterFiles = await walkCharacterFiles(baseDir);
    for (const filePath of characterFiles) {
      const code = guessCodeFromFile(filePath);
      const nextEntry = { code, filePath, baseDir };
      if (!code) {
        fallbackEntries.push(nextEntry);
        continue;
      }

      const prev = entryByCode.get(code);
      if (!prev) {
        entryByCode.set(code, nextEntry);
        continue;
      }

      const prevPriority = getFilePriority(prev.filePath);
      const nextPriority = getFilePriority(filePath);
      if (nextPriority > prevPriority) {
        entryByCode.set(code, nextEntry);
      }
    }
  }

  const entries = [...entryByCode.values(), ...fallbackEntries];

  cache.localIndex = { ts: now, entries };
  return entries;
};

const buildRemoteIndex = async () => {
  const now = Date.now();
  if (now - cache.remoteIndex.ts < 5 * 60_000) {
    return cache.remoteIndex.entries;
  }

  const indexUrl = 'https://api.github.com/repos/venetanji/polyu-storyworld/contents/characters';
  try {
    const response = await fetch(indexUrl, {
      headers: {
        'User-Agent': 'mind-special-server',
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      cache.remoteIndex = { ts: now, entries: [] };
      return [];
    }

    const list = await response.json();
    const entries = Array.isArray(list)
      ? list
        .filter((item) => item?.type === 'file' && YAML_EXT_RE.test(item?.name || ''))
        .map((item) => ({
          code: normalizeCode(path.basename(item.name, path.extname(item.name))),
          name: item.name,
          downloadUrl: item.download_url,
          htmlUrl: item.html_url,
          path: item.path,
        }))
        .filter((item) => item.code)
      : [];

    cache.remoteIndex = { ts: now, entries };
    return entries;
  } catch {
    cache.remoteIndex = { ts: now, entries: [] };
    return [];
  }
};

const fetchRemoteByCode = async ({ rootDir, code, cacheRemote = false }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const candidateUrls = [
    `https://raw.githubusercontent.com/venetanji/polyu-storyworld/main/characters/${normalizedCode}.yaml`,
    `https://raw.githubusercontent.com/venetanji/polyu-storyworld/main/characters/${normalizedCode}.yml`,
    `https://raw.githubusercontent.com/venetanji/polyu-storyworld/main/${normalizedCode}.yaml`,
    `https://raw.githubusercontent.com/venetanji/polyu-storyworld/main/${normalizedCode}.yml`,
  ];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const raw = await response.text();
      const data = YAML.parse(raw);
      if (cacheRemote) {
        try {
          await writeRemoteCharacterCache({ rootDir, code: normalizedCode, rawYaml: raw });
        } catch {
          // cache write failure should not break main flow
        }
      }
      return mapYamlToCharacter({
        data,
        code: normalizedCode,
        sourceType: 'remote',
        sourceUrl: url,
      });
    } catch {
      // try next url
    }
  }

  const remoteIndex = await buildRemoteIndex();
  const matched = remoteIndex.find((item) => item.code === normalizedCode);
  if (!matched?.downloadUrl) return null;

  try {
    const response = await fetch(matched.downloadUrl);
    if (!response.ok) return null;
    const raw = await response.text();
    const data = YAML.parse(raw);
    if (cacheRemote) {
      try {
        await writeRemoteCharacterCache({ rootDir, code: normalizedCode, rawYaml: raw });
      } catch {
        // cache write failure should not break main flow
      }
    }
    return mapYamlToCharacter({
      data,
      code: normalizedCode,
      sourceType: 'remote',
      sourcePath: matched.path,
      sourceUrl: matched.downloadUrl,
    });
  } catch {
    return null;
  }
};

const findLocalByCode = async (rootDir, code) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const localIndex = await buildLocalIndex(rootDir);
  const matched = localIndex.find((item) => item.code === normalizedCode);
  if (!matched?.filePath) return null;

  try {
    return await loadCharacterFromFile(rootDir, matched.filePath, normalizedCode);
  } catch {
    return null;
  }
};

const matchText = (value, keyword) => String(value || '').toLowerCase().includes(keyword);

const findLocalByName = async (rootDir, nameOrCode) => {
  const keyword = String(nameOrCode || '').trim().toLowerCase();
  if (!keyword) return null;

  const localIndex = await buildLocalIndex(rootDir);
  for (const entry of localIndex) {
    const localCode = String(entry.code || '').toLowerCase();
    if (localCode && localCode === keyword) {
      return loadCharacterFromFile(rootDir, entry.filePath, entry.code);
    }
  }

  for (const entry of localIndex) {
    try {
      const character = await loadCharacterFromFile(rootDir, entry.filePath, entry.code);
      if (matchText(character?.displayName, keyword) || matchText(character?.profile?.name, keyword)) {
        return character;
      }
    } catch {
      // ignore broken yaml file
    }
  }

  return null;
};

export const getCharacterByName = async ({ rootDir, query, cacheRemote = false }) => {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    const error = new Error('invalid_character_query');
    error.code = 'invalid_character_query';
    throw error;
  }

  const byCodeFromProfile = await findLocalProfileByCode(rootDir, normalizedQuery);
  if (byCodeFromProfile) {
    return enrichCharacterWithPortrait({ rootDir, character: byCodeFromProfile, cacheRemote });
  }

  const byCode = await findLocalByCode(rootDir, normalizedQuery);
  if (byCode) {
    return enrichCharacterWithPortrait({ rootDir, character: byCode, cacheRemote });
  }

  const byName = await findLocalByName(rootDir, normalizedQuery);
  if (byName) {
    return enrichCharacterWithPortrait({ rootDir, character: byName, cacheRemote });
  }

  const remoteCharacter = await fetchRemoteByCode({ rootDir, code: normalizedQuery, cacheRemote });
  if (!remoteCharacter) return null;
  return enrichCharacterWithPortrait({ rootDir, character: remoteCharacter, cacheRemote });
};

export const searchCharacters = async ({ rootDir, query = '', limit = 20 }) => {
  const keyword = String(query || '').trim().toLowerCase();
  const cappedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const results = [];
  const seenCodes = new Set();

  const pushResult = (item) => {
    const code = String(item?.code || '').toLowerCase();
    if (!code || seenCodes.has(code)) return;
    seenCodes.add(code);
    results.push(item);
  };

  const localIndex = await buildLocalIndex(rootDir);
  for (const entry of localIndex) {
    if (results.length >= cappedLimit) break;
    const localCode = String(entry.code || '').toLowerCase();
    if (!localCode) continue;
    if (keyword && !localCode.includes(keyword)) {
      try {
        const character = await loadCharacterFromFile(rootDir, entry.filePath, entry.code);
        const byName = matchText(character?.displayName, keyword) || matchText(character?.profile?.name, keyword);
        if (!byName) continue;
        pushResult({
          code: character.code,
          displayName: character.displayName,
          source: character.source,
        });
      } catch {
        continue;
      }
    } else {
      pushResult({
        code: localCode,
        displayName: localCode,
        source: {
          type: 'local',
          path: toRelativePath(rootDir, entry.filePath),
          url: null,
        },
      });
    }
  }

  if (results.length < cappedLimit) {
    const remoteIndex = await buildRemoteIndex();
    for (const item of remoteIndex) {
      if (results.length >= cappedLimit) break;
      if (!item.code) continue;
      if (keyword && !item.code.includes(keyword)) continue;
      pushResult({
        code: item.code,
        displayName: item.code,
        source: {
          type: 'remote',
          path: item.path,
          url: item.downloadUrl,
        },
      });
    }
  }

  return results;
};
