import { promises as fs } from 'node:fs';
import path from 'node:path';
import { analyzeCharacterEmotion } from '../server/emotion-service.mjs';

const rootDir = process.cwd();

const defaultProfilePath = path.join(
  rootDir,
  'seeds',
  'characters',
  'presets',
  '5738g',
  'profile.json'
);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    write: false,
    profilePath: defaultProfilePath,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || '').trim();
    if (!arg) continue;
    if (arg === '--write') {
      options.write = true;
      continue;
    }
    if (arg === '--file' || arg === '-f') {
      const value = String(args[i + 1] || '').trim();
      if (value) {
        options.profilePath = path.isAbsolute(value) ? value : path.join(rootDir, value);
        i += 1;
      }
    }
  }

  return options;
};

const run = async () => {
  const { write, profilePath } = parseArgs();
  const raw = await fs.readFile(profilePath, 'utf8');
  const doc = JSON.parse(raw);
  const character = doc?.character || {};

  const emotion = analyzeCharacterEmotion({ character });

  const report = {
    profile: path.relative(rootDir, profilePath).replace(/\\/g, '/'),
    top3: emotion.top3,
    confidence: emotion.confidence,
    source: emotion.source,
    weights: emotion.weights,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!write) return;

  const next = {
    ...doc,
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

  await fs.writeFile(profilePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`updated:${path.relative(rootDir, profilePath).replace(/\\/g, '/')}`);
};

run().catch((error) => {
  console.error('emotion profile test failed:', error?.message || error);
  process.exitCode = 1;
});
