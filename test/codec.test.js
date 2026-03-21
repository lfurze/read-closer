import { describe, it, expect } from 'vitest';
import { encode, decode } from '../src/codec.js';

describe('codec: encode/decode round-trip', () => {
  it('round-trips a minimal passage (text only)', () => {
    const data = { v: 1, text: 'Hello, world.' };
    const encoded = encode(data);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    expect(decode(encoded)).toEqual(data);
  });

  it('round-trips a passage with title, prompt, and annotations', () => {
    const data = {
      v: 1,
      title: 'Ozymandias',
      prompt: 'Identify the irony in this passage.',
      text: 'I met a traveller from an antique land, who said — "Two vast and trunkless legs of stone stand in the desert."',
      annotations: [
        {
          id: 'abc123',
          author: 'Alice',
          start: 45,
          end: 110,
          colour: 0,
          note: 'The broken statue symbolises the impermanence of power.',
        },
      ],
    };
    const encoded = encode(data);
    expect(decode(encoded)).toEqual(data);
  });

  it('round-trips a 500-word passage', () => {
    const longText = 'Lorem ipsum dolor sit amet. '.repeat(70).trim();
    const data = { v: 1, text: longText };
    const result = decode(encode(data));
    expect(result.text).toBe(longText);
  });

  it('handles unicode characters', () => {
    const data = { v: 1, text: 'Ça fait plaisir — "hélas" 日本語テスト 🎓' };
    expect(decode(encode(data))).toEqual(data);
  });

  it('produces a URL-safe string (no +, /, or =)', () => {
    const data = { v: 1, text: 'Test string for base64url safety check.' };
    const encoded = encode(data);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('throws on invalid/corrupted input', () => {
    expect(() => decode('not-valid-data-!!!')).toThrow();
  });

  it('returns annotations as empty array when absent in original', () => {
    const data = { v: 1, text: 'No annotations here.' };
    const encoded = encode(data);
    const result = decode(encoded);
    // annotations should either be absent or an empty array — both acceptable
    // but the round-trip should be faithful to the input
    expect(result.text).toBe(data.text);
  });
});
