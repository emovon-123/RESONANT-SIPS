import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const VALID_IDENTIFIER = /^[A-Za-z0-9_-]{2,64}$/;
const YAML_EXT_RE = /\.(yaml|yml)$/i;
const JSON_EXT_RE = /\.json$/i;

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

const getPresetCharacterDir = (rootDir) => path.join(rootDir, 'seeds', 'characters', 'presets');
const getAddedCharacterDir = (rootDir) => path.join(rootDir, 'seeds', 'characters', 'added');

const toCharacterProfileDocument = ({ code, character, preset = false }) => ({
  version: 1,
  id: String(code || character?.code || '').trim().toLowerCase(),
  name: String(character?.displayName || character?.profile?.name || code || '').trim(),
  preset,
  lockedUntilUserAdded: Boolean(preset),
  enabledByDefault: Boolean(preset),
  character: {
    code: String(character?.code || code || '').trim().toLowerCase(),
    displayName: String(character?.displayName || character?.profile?.name || code || '').trim(),
    categoryId: character?.categoryId || null,
    profile: {
      name: String(character?.profile?.name || character?.displayName || code || '').trim(),
      age: character?.profile?.age ?? null,
      personality: parseNameList(character?.profile?.personality || []),
      appearance: String(character?.profile?.appearance || '').trim(),
      occupation: String(character?.profile?.occupation || '').trim(),
    },
    background: {
      backstory: String(character?.background?.backstory || '').trim(),
      origin: String(character?.background?.origin || '').trim(),
    },
    dialogueStyle: {
      tone: String(character?.dialogueStyle?.tone || '').trim(),
      features: parseNameList(character?.dialogueStyle?.features || []),
      openingLines: Array.isArray(character?.dialogueStyle?.openingLines)
        ? character.dialogueStyle.openingLines.map((line) => String(line || '').trim()).filter(Boolean)
        : [],
    },
    source: {
      type: character?.source?.type || 'local_profile',
      path: character?.source?.path || null,
      url: character?.source?.url || null,
    },
  },
});

const mapProfileToCharacter = ({ doc, code, sourcePath = null }) => {
  const embedded = doc?.character || {};
  const normalizedCode = normalizeCode(embedded?.code || doc?.id || code) || 'unknown';
  const displayName = String(embedded?.displayName || doc?.name || embedded?.profile?.name || normalizedCode).trim();

  return {
    code: normalizedCode,
    displayName,
    categoryId: String(embedded?.categoryId || '').trim() || null,
    profile: {
      name: String(embedded?.profile?.name || displayName).trim(),
      age: embedded?.profile?.age ?? null,
      personality: parseNameList(embedded?.profile?.personality || []),
      appearance: String(embedded?.profile?.appearance || '').trim(),
      occupation: String(embedded?.profile?.occupation || '').trim(),
    },
    background: {
      backstory: String(embedded?.background?.backstory || '').trim(),
      origin: String(embedded?.background?.origin || '').trim(),
    },
    dialogueStyle: {
      tone: String(embedded?.dialogueStyle?.tone || '').trim(),
      features: parseNameList(embedded?.dialogueStyle?.features || []),
      openingLines: Array.isArray(embedded?.dialogueStyle?.openingLines)
        ? embedded.dialogueStyle.openingLines.map((line) => String(line || '').trim()).filter(Boolean)
        : [],
    },
    source: {
      type: 'local_profile',
      path: sourcePath,
      url: null,
    },
  };
};

const writeRemoteCharacterCache = async ({ rootDir, code, rawYaml }) => {
  const normalizedCode = normalizeCode(code);
  if (!rootDir || !normalizedCode || typeof rawYaml !== 'string' || !rawYaml.trim()) return null;

  const cacheDir = getAddedCharacterDir(rootDir);
  await ensureDir(cacheDir);

  const data = YAML.parse(rawYaml);
  const character = mapYamlToCharacter({
    data,
    code: normalizedCode,
    sourceType: 'remote',
    sourcePath: null,
    sourceUrl: null,
  });

  const targetFile = path.join(cacheDir, `${normalizedCode}.json`);
  const profileDoc = toCharacterProfileDocument({ code: normalizedCode, character, preset: false });
  await fs.writeFile(targetFile, `${JSON.stringify(profileDoc, null, 2)}\n`, 'utf8');

  cache.localIndex.ts = 0;
  cache.localContextByFile.delete(targetFile);
  return targetFile;
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
  const character = mapProfileToCharacter({
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

  const entries = [];
  for (const baseDir of existingRoots) {
    const characterFiles = await walkCharacterFiles(baseDir);
    for (const filePath of characterFiles) {
      const code = guessCodeFromFile(filePath);
      entries.push({
        code,
        filePath,
        baseDir,
      });
    }
  }

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

  const byCode = await findLocalByCode(rootDir, normalizedQuery);
  if (byCode) return byCode;

  const byName = await findLocalByName(rootDir, normalizedQuery);
  if (byName) return byName;

  return fetchRemoteByCode({ rootDir, code: normalizedQuery, cacheRemote });
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
