import { describe, it, expect } from 'vitest';
import { createState, addAnnotation, removeAnnotation, updateAnnotation, getAuthors } from '../src/state.js';

describe('state management', () => {
  it('creates a state from decoded data', () => {
    const state = createState({ v: 1, text: 'Hello', title: 'Test', prompt: 'Read carefully' });
    expect(state.v).toBe(1);
    expect(state.text).toBe('Hello');
    expect(state.title).toBe('Test');
    expect(state.prompt).toBe('Read carefully');
    expect(state.annotations).toEqual([]);
  });

  it('preserves existing annotations', () => {
    const ann = { id: 'x1', author: 'A', start: 0, end: 5, colour: 0, note: 'hi' };
    const state = createState({ v: 1, text: 'Hello', annotations: [ann] });
    expect(state.annotations).toHaveLength(1);
    expect(state.annotations[0].id).toBe('x1');
  });

  it('adds an annotation with a generated id', () => {
    const state = createState({ v: 1, text: 'Hello world' });
    const updated = addAnnotation(state, { author: 'Bob', start: 0, end: 5, colour: 1, note: 'greeting' });
    expect(updated.annotations).toHaveLength(1);
    expect(updated.annotations[0].author).toBe('Bob');
    expect(updated.annotations[0].id).toHaveLength(6);
  });

  it('does not mutate the original state', () => {
    const state = createState({ v: 1, text: 'Hello' });
    const updated = addAnnotation(state, { author: 'A', start: 0, end: 3, colour: 0, note: '' });
    expect(state.annotations).toHaveLength(0);
    expect(updated.annotations).toHaveLength(1);
  });

  it('removes an annotation by id', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{ id: 'rm1', author: 'A', start: 0, end: 3, colour: 0, note: 'x' }],
    });
    const updated = removeAnnotation(state, 'rm1');
    expect(updated.annotations).toHaveLength(0);
  });

  it('updates an annotation note and colour', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{ id: 'up1', author: 'A', start: 0, end: 3, colour: 0, note: 'old' }],
    });
    const updated = updateAnnotation(state, 'up1', { note: 'new', colour: 2 });
    expect(updated.annotations[0].note).toBe('new');
    expect(updated.annotations[0].colour).toBe(2);
  });

  it('returns unique authors', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [
        { id: 'a1', author: 'Alice', start: 0, end: 2, colour: 0, note: '' },
        { id: 'a2', author: 'Bob', start: 3, end: 5, colour: 1, note: '' },
        { id: 'a3', author: 'Alice', start: 1, end: 4, colour: 2, note: '' },
      ],
    });
    expect(getAuthors(state)).toEqual(['Alice', 'Bob']);
  });
});
