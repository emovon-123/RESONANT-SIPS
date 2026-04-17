import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { analyzeCharacterEmotionWithAI } from '../server/emotion-service.mjs';

const rootDir = process.cwd();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    id: '5738g',
    scope: 'presets',
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || '').trim();
    if (!arg) continue;

    if (arg === '--id' || arg === '-i') {
      const value = String(args[i + 1] || '').trim();
      if (value) {
        options.id = value;
        i += 1;
      }
      continue;
    }

    if (arg === '--scope' || arg === '-s') {
      const value = String(args[i + 1] || '').trim();
      if (value === 'presets' || value === 'added') {
        options.scope = value;
        i += 1;
      }
      continue;
    }
  }

  return options;
};

const normalizeList = (value) => {
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

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, '/');

const readJsonIfExists = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const run = async () => {
  const { id, scope } = parseArgs();
  const roleId = String(id || '').trim();
  if (!roleId) {
    throw new Error('invalid_role_id');
  }

  const roleDir = path.join(rootDir, 'seeds', 'characters', scope, roleId);
  const sourcePath = path.join(roleDir, 'source.yaml');
  const profilePath = path.join(roleDir, 'profile.json');

  const yamlRaw = await fs.readFile(sourcePath, 'utf8');
  const source = YAML.parse(yamlRaw) || {};
  const existing = (await readJsonIfExists(profilePath)) || {};

  const displayName = String(source.name || existing?.name || roleId).trim();
  const openingLines = Array.isArray(source?.dialogueStyle?.openingLines)
    ? source.dialogueStyle.openingLines.map((item) => String(item || '').trim()).filter(Boolean)
    : (Array.isArray(existing?.character?.dialogueStyle?.openingLines)
      ? existing.character.dialogueStyle.openingLines
      : []);

  const character = {
    code: roleId,
    displayName,
    categoryId: String(source.categoryId || existing?.character?.categoryId || '').trim() || 'workplace',
    profile: {
      name: displayName,
      age: Number.isFinite(Number(source.age)) ? Number(source.age) : (existing?.character?.profile?.age ?? null),
      personality: normalizeList(source.personality).length > 0
        ? normalizeList(source.personality)
        : normalizeList(existing?.character?.profile?.personality),
      appearance: String(source.appearance || existing?.character?.profile?.appearance || '').trim(),
      occupation: String(source.occupation || source.job || existing?.character?.profile?.occupation || '').trim(),
    },
    background: {
      backstory: String(source.backstory || existing?.character?.background?.backstory || '').trim(),
      origin: String(source.origin || existing?.character?.background?.origin || '').trim(),
    },
    dialogueStyle: {
      tone: String(source?.dialogueStyle?.tone || existing?.character?.dialogueStyle?.tone || '').trim(),
      features: normalizeList(source?.dialogueStyle?.features).length > 0
        ? normalizeList(source.dialogueStyle.features)
        : normalizeList(existing?.character?.dialogueStyle?.features),
      openingLines,
    },
    source: {
      type: scope === 'presets' ? 'preset' : 'local_profile',
      path: toRelative(sourcePath),
      url: null,
    },
  };

  const emotion = await analyzeCharacterEmotionWithAI({
    character,
    options: {
      allowPartialModelOutput: false,
      requireCompleteWeightSet: true,
      maxAttempts: 3,
    },
  });

  const profile = {
    version: 1,
    id: roleId,
    name: displayName,
    preset: scope === 'presets',
    lockedUntilUserAdded: scope === 'presets'
      ? (existing?.lockedUntilUserAdded !== false)
      : false,
    enabledByDefault: scope === 'presets'
      ? (existing?.enabledByDefault !== false)
      : false,
    notes: typeof existing?.notes === 'string' ? existing.notes : undefined,
    character,
    emotionSchemaVersion: 2,
    currentEmotionWeights: emotion.weights,
    currentEmotionTop3: emotion.top3,
    emotionAnalysis: {
      confidence: emotion.confidence,
      rationale: emotion.rationale,
      source: emotion.source,
      sourceHash: emotion.sourceHash,
      analyzedAt: Date.now(),
    },
  };

  if (profile.notes === undefined) {
    delete profile.notes;
  }

  await fs.writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');

  const result = {
    id: roleId,
    scope,
    source: toRelative(sourcePath),
    profile: toRelative(profilePath),
    top3: emotion.top3,
    confidence: emotion.confidence,
    emotionSource: emotion.source,
  };

  console.log(JSON.stringify(result, null, 2));
};

run().catch((error) => {
  console.error('generate character profile failed:', error?.message || error);
  process.exitCode = 1;
});
