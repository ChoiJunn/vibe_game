import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import beatmapJson from './office-day-01.json';
import beatmapSchema from './beatmap.schema.json';
import { validateBeatmap } from '@/domain/validateBeatmap';

describe('office-day-01 beatmap', () => {
  it('matches the JSON Schema and domain invariants', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateSchema = ajv.compile(beatmapSchema);

    expect(validateSchema(beatmapJson), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(() => validateBeatmap(beatmapJson)).not.toThrow();
  });
});
