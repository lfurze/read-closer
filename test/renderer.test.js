import { describe, it, expect } from 'vitest';
import { renderPassage } from '../src/renderer.js';

describe('renderPassage', () => {
  it('returns plain text when there are no annotations', () => {
    const html = renderPassage('Hello world', []);
    expect(html).toBe('Hello world');
  });

  it('wraps a single annotation in a highlight span', () => {
    const html = renderPassage('Hello world', [
      { id: 'a1', author: 'A', start: 0, end: 5, colour: 1, note: 'greeting' },
    ]);
    expect(html).toContain('<span');
    expect(html).toContain('data-colour="1"');
    expect(html).toContain('data-id="a1"');
    expect(html).toContain('Hello');
    expect(html).toContain(' world');
  });

  it('handles two non-overlapping annotations', () => {
    const html = renderPassage('Hello world foo', [
      { id: 'a1', author: 'A', start: 0, end: 5, colour: 0, note: '' },
      { id: 'a2', author: 'B', start: 6, end: 11, colour: 2, note: '' },
    ]);
    expect(html).toContain('data-id="a1"');
    expect(html).toContain('data-id="a2"');
    expect(html).toContain(' foo');
  });

  it('handles overlapping annotations', () => {
    // "Hello world" — a1 covers [0,8), a2 covers [3,11)
    const html = renderPassage('Hello world', [
      { id: 'a1', author: 'A', start: 0, end: 8, colour: 0, note: '' },
      { id: 'a2', author: 'B', start: 3, end: 11, colour: 1, note: '' },
    ]);
    // Both annotations should appear
    expect(html).toContain('data-id="a1"');
    expect(html).toContain('data-id="a2"');
  });

  it('escapes HTML in text', () => {
    const html = renderPassage('<script>alert("xss")</script>', []);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('filters annotations by visible authors', () => {
    const annotations = [
      { id: 'a1', author: 'Alice', start: 0, end: 5, colour: 0, note: '' },
      { id: 'a2', author: 'Bob', start: 6, end: 11, colour: 1, note: '' },
    ];
    const html = renderPassage('Hello world!', annotations, ['Alice']);
    expect(html).toContain('data-id="a1"');
    expect(html).not.toContain('data-id="a2"');
  });
});
