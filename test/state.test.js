import { describe, it, expect } from 'vitest';
import { createState, addAnnotation, removeAnnotation, updateAnnotation, addReply, getAuthors } from '../src/state.js';

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

  it('adds a reply to an annotation', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{ id: 'r1', author: 'Alice', start: 0, end: 5, colour: 0, note: 'interesting' }],
    });
    const updated = addReply(state, 'r1', { author: 'Bob', text: 'I agree!' });
    expect(updated.annotations[0].replies).toHaveLength(1);
    expect(updated.annotations[0].replies[0].author).toBe('Bob');
    expect(updated.annotations[0].replies[0].text).toBe('I agree!');
    expect(updated.annotations[0].replies[0].id).toHaveLength(6);
  });

  it('does not mutate original when adding a reply', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{ id: 'r2', author: 'A', start: 0, end: 5, colour: 0, note: 'x' }],
    });
    const updated = addReply(state, 'r2', { author: 'B', text: 'reply' });
    expect(state.annotations[0].replies).toBeUndefined();
    expect(updated.annotations[0].replies).toHaveLength(1);
  });

  it('preserves existing replies when adding another', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{
        id: 'r3', author: 'A', start: 0, end: 5, colour: 0, note: 'x',
        replies: [{ id: 'rp1', author: 'B', text: 'first' }],
      }],
    });
    const updated = addReply(state, 'r3', { author: 'C', text: 'second' });
    expect(updated.annotations[0].replies).toHaveLength(2);
    expect(updated.annotations[0].replies[0].text).toBe('first');
    expect(updated.annotations[0].replies[1].text).toBe('second');
  });

  it('includes reply authors in getAuthors', () => {
    const state = createState({
      v: 1, text: 'Hello',
      annotations: [{
        id: 'r4', author: 'Alice', start: 0, end: 5, colour: 0, note: 'x',
        replies: [{ id: 'rp1', author: 'Charlie', text: 'hi' }],
      }],
    });
    expect(getAuthors(state)).toEqual(['Alice', 'Charlie']);
  });
});
