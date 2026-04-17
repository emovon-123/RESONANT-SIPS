import { analyzeCharacterEmotion } from './emotion-service.mjs';

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

export const buildCharacterProfileDocument = ({ code, character, preset = false, notes } = {}) => {
  const normalizedId = String(code || character?.code || '').trim().toLowerCase();
  const displayName = String(character?.displayName || character?.profile?.name || code || '').trim();
  const emotion = analyzeCharacterEmotion({ character });

  const doc = {
    version: 1,
    id: normalizedId,
    name: displayName,
    preset,
    lockedUntilUserAdded: Boolean(preset),
    enabledByDefault: Boolean(preset),
    character: {
      code: String(character?.code || code || '').trim().toLowerCase(),
      displayName,
      categoryId: character?.categoryId || null,
      profile: {
        name: String(character?.profile?.name || displayName).trim(),
        age: character?.profile?.age ?? null,
        personality: normalizeList(character?.profile?.personality || []),
        appearance: String(character?.profile?.appearance || '').trim(),
        occupation: String(character?.profile?.occupation || '').trim(),
      },
      background: {
        backstory: String(character?.background?.backstory || '').trim(),
        origin: String(character?.background?.origin || '').trim(),
      },
      dialogueStyle: {
        tone: String(character?.dialogueStyle?.tone || '').trim(),
        features: normalizeList(character?.dialogueStyle?.features || []),
        openingLines: Array.isArray(character?.dialogueStyle?.openingLines)
          ? character.dialogueStyle.openingLines.map((line) => String(line || '').trim()).filter(Boolean)
          : [],
      },
      source: {
        type: character?.source?.type || 'local_profile',
        path: character?.source?.path || null,
        url: character?.source?.url || null,
      },
      portrait: character?.portrait && typeof character.portrait === 'object'
        ? {
          path: character.portrait.path || null,
          url: character.portrait.url || null,
          mimeType: character.portrait.mimeType || null,
        }
        : null,
    },
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

  if (typeof notes === 'string' && notes.trim()) {
    doc.notes = notes.trim();
  }

  return doc;
};

export const mapProfileDocumentToCharacter = ({ doc, code, sourcePath = null }) => {
  const embedded = doc?.character || {};
  const normalizedCode = String(embedded?.code || doc?.id || code || '').trim().toLowerCase() || 'unknown';
  const displayName = String(embedded?.displayName || doc?.name || embedded?.profile?.name || normalizedCode).trim();
  const sourceType = String(embedded?.source?.type || '').trim() || (doc?.preset ? 'preset' : 'local_profile');

  return {
    code: normalizedCode,
    displayName,
    categoryId: String(embedded?.categoryId || '').trim() || null,
    profile: {
      name: String(embedded?.profile?.name || displayName).trim(),
      age: embedded?.profile?.age ?? null,
      personality: normalizeList(embedded?.profile?.personality || []),
      appearance: String(embedded?.profile?.appearance || '').trim(),
      occupation: String(embedded?.profile?.occupation || '').trim(),
    },
    background: {
      backstory: String(embedded?.background?.backstory || '').trim(),
      origin: String(embedded?.background?.origin || '').trim(),
    },
    dialogueStyle: {
      tone: String(embedded?.dialogueStyle?.tone || '').trim(),
      features: normalizeList(embedded?.dialogueStyle?.features || []),
      openingLines: Array.isArray(embedded?.dialogueStyle?.openingLines)
        ? embedded.dialogueStyle.openingLines.map((line) => String(line || '').trim()).filter(Boolean)
        : [],
    },
    source: {
      type: sourceType,
      path: sourcePath,
      url: null,
    },
    portrait: embedded?.portrait && typeof embedded.portrait === 'object'
      ? {
        path: String(embedded.portrait.path || '').trim() || null,
        url: String(embedded.portrait.url || '').trim() || null,
        mimeType: String(embedded.portrait.mimeType || '').trim() || null,
        dataUrl: null,
      }
      : null,
  };
};
