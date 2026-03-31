import { prepare, layout, prepareWithSegments, layoutWithLines, clearCache } from '@chenglou/pretext';

// ===== Demo 1: Basic Measurement =====
const measureInput = document.getElementById('measure-input');
const measureWidth = document.getElementById('measure-width');
const measureWidthVal = document.getElementById('measure-width-val');
const measureLh = document.getElementById('measure-lh');
const measureFont = document.getElementById('measure-font');
const measureBtn = document.getElementById('measure-btn');
const measureResult = document.getElementById('measure-result');

measureWidth.addEventListener('input', () => {
  measureWidthVal.textContent = measureWidth.value;
});

measureBtn.addEventListener('click', () => {
  const text = measureInput.value;
  const font = measureFont.value;
  const maxWidth = parseInt(measureWidth.value, 10);
  const lineHeight = parseInt(measureLh.value, 10);

  const t0 = performance.now();
  const prepared = prepare(text, font);
  const prepTime = performance.now() - t0;

  const t1 = performance.now();
  const result = layout(prepared, maxWidth, lineHeight);
  const layoutTime = performance.now() - t1;

  measureResult.style.display = 'block';
  measureResult.textContent =
    `prepare(): ${prepTime.toFixed(3)} ms (one-time text analysis + measurement)\n` +
    `layout():  ${layoutTime.toFixed(4)} ms (pure arithmetic on cached data)\n\n` +
    `Result:\n` +
    `  height:    ${result.height}px\n` +
    `  lineCount: ${result.lineCount}\n\n` +
    `Container: ${maxWidth}px wide, ${lineHeight}px line-height, font "${font}"`;
});

// ===== Demo 2: Canvas Rendering =====
const canvasInput = document.getElementById('canvas-input');
const canvas = document.getElementById('render-canvas');
const ctx = canvas.getContext('2d');
const canvasWrap = document.getElementById('canvas-wrap');
const canvasWidthDisplay = document.getElementById('canvas-width-display');
const canvasLinesInfo = document.getElementById('canvas-lines-info');
const canvasResize = document.getElementById('canvas-resize');

const CANVAS_FONT = '16px Inter, system-ui, sans-serif';
const CANVAS_LINE_HEIGHT = 24;
const CANVAS_PADDING = 16;

function renderCanvas() {
  const text = canvasInput.value;
  if (!text) return;

  const wrapWidth = canvasWrap.clientWidth;
  const textWidth = wrapWidth - CANVAS_PADDING * 2 - 12; // 12 for resize handle

  const t0 = performance.now();
  const prepared = prepareWithSegments(text, CANVAS_FONT);
  const prepTime = performance.now() - t0;

  const t1 = performance.now();
  const result = layoutWithLines(prepared, textWidth, CANVAS_LINE_HEIGHT);
  const layoutTime = performance.now() - t1;

  const dpr = window.devicePixelRatio || 1;
  const canvasHeight = result.lines.length * CANVAS_LINE_HEIGHT + CANVAS_PADDING * 2;

  canvas.width = wrapWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = `${wrapWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, wrapWidth, canvasHeight);

  // Render lines
  ctx.font = CANVAS_FONT;
  ctx.fillStyle = '#1a1a1a';
  ctx.textBaseline = 'top';

  for (let i = 0; i < result.lines.length; i++) {
    const line = result.lines[i];
    const y = CANVAS_PADDING + i * CANVAS_LINE_HEIGHT + (CANVAS_LINE_HEIGHT - 16) / 2;
    ctx.fillText(line.text, CANVAS_PADDING, y);
  }

  // Line count guides (subtle)
  ctx.strokeStyle = '#f0ede8';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < result.lines.length; i++) {
    const y = CANVAS_PADDING + i * CANVAS_LINE_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, y);
    ctx.lineTo(wrapWidth - CANVAS_PADDING - 12, y);
    ctx.stroke();
  }

  canvasWidthDisplay.textContent = `${textWidth}px`;
  canvasLinesInfo.textContent =
    `${result.lines.length} lines · prepare: ${prepTime.toFixed(2)}ms · layout: ${layoutTime.toFixed(4)}ms`;
}

// Initial render
canvasInput.addEventListener('input', renderCanvas);
setTimeout(renderCanvas, 100); // Wait for font load

// Resize handle
let resizing = false;
canvasResize.addEventListener('mousedown', (e) => {
  e.preventDefault();
  resizing = true;
});
document.addEventListener('mousemove', (e) => {
  if (!resizing) return;
  const rect = canvasWrap.parentElement.getBoundingClientRect();
  const newWidth = Math.max(150, Math.min(e.clientX - rect.left, rect.width));
  canvasWrap.style.width = `${newWidth}px`;
  renderCanvas();
});
document.addEventListener('mouseup', () => { resizing = false; });

// ===== Demo 3: Performance Benchmark =====
const perfCount = document.getElementById('perf-count');
const perfBtn = document.getElementById('perf-btn');
const perfResult = document.getElementById('perf-result');
const perfDomBar = document.getElementById('perf-dom-bar');
const perfPretextBar = document.getElementById('perf-pretext-bar');
const perfDomLabel = document.getElementById('perf-dom-label');
const perfPretextLabel = document.getElementById('perf-pretext-label');
const perfSpeedup = document.getElementById('perf-speedup');
const perfDetails = document.getElementById('perf-details');

const SAMPLE_TEXTS = [
  'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet.',
  'In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms.',
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
  'Call me Ishmael. Some years ago — never mind how long precisely — having little or no money in my purse.',
  'All happy families are alike; each unhappy family is unhappy in its own way.',
  '春天到了，万物复苏。The cherry blossoms are blooming. 桜が咲いています。',
  'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer the slings and arrows.',
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
];

perfBtn.addEventListener('click', () => {
  const count = parseInt(perfCount.value, 10);
  perfResult.style.display = 'block';
  perfBtn.disabled = true;
  perfBtn.textContent = 'Running...';

  // Generate test data
  const texts = [];
  for (let i = 0; i < count; i++) {
    texts.push(SAMPLE_TEXTS[i % SAMPLE_TEXTS.length]);
  }

  requestAnimationFrame(() => {
    // --- DOM measurement ---
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:400px;font:16px Inter,system-ui,sans-serif;line-height:24px;visibility:hidden;';
    document.body.appendChild(container);

    const domStart = performance.now();
    const domHeights = [];
    for (const text of texts) {
      const el = document.createElement('div');
      el.textContent = text;
      container.appendChild(el);
      domHeights.push(el.offsetHeight);
      container.removeChild(el);
    }
    const domTime = performance.now() - domStart;
    document.body.removeChild(container);

    // --- Pretext measurement ---
    clearCache();
    const font = '16px Inter, system-ui, sans-serif';
    const maxWidth = 400;
    const lineHeight = 24;

    // Phase 1: prepare (one-time)
    const prepStart = performance.now();
    const prepared = texts.map(t => prepare(t, font));
    const prepTime = performance.now() - prepStart;

    // Phase 2: layout (the fast part)
    const layoutStart = performance.now();
    const pretextHeights = [];
    for (const p of prepared) {
      const r = layout(p, maxWidth, lineHeight);
      pretextHeights.push(r.height);
    }
    const layoutTime = performance.now() - layoutStart;

    const totalPretextTime = prepTime + layoutTime;
    const speedupLayout = domTime / layoutTime;
    const speedupTotal = domTime / totalPretextTime;

    // Display
    const maxTime = Math.max(domTime, totalPretextTime);
    perfDomBar.style.width = `${(domTime / maxTime) * 100}%`;
    perfPretextBar.style.width = `${Math.max((totalPretextTime / maxTime) * 100, 3)}%`;
    perfDomLabel.textContent = `${domTime.toFixed(2)} ms`;
    perfPretextLabel.textContent = `${totalPretextTime.toFixed(2)} ms (prep: ${prepTime.toFixed(2)} + layout: ${layoutTime.toFixed(4)})`;
    perfSpeedup.textContent = `${speedupLayout.toFixed(0)}x faster layout · ${speedupTotal.toFixed(1)}x faster total (including prepare)`;

    perfDetails.textContent =
      `${count} text blocks measured at 400px width\n\n` +
      `DOM (offsetHeight):     ${domTime.toFixed(3)} ms  (${(domTime / count).toFixed(4)} ms/block)\n` +
      `Pretext prepare():      ${prepTime.toFixed(3)} ms  (${(prepTime / count).toFixed(4)} ms/block) — one-time cost\n` +
      `Pretext layout():       ${layoutTime.toFixed(4)} ms  (${(layoutTime / count).toFixed(6)} ms/block) — runs on every resize\n\n` +
      `On resize, only layout() runs → ${speedupLayout.toFixed(0)}x faster than DOM\n` +
      `Height agreement: ${domHeights.filter((h, i) => Math.abs(h - pretextHeights[i]) <= 2).length}/${count} within 2px`;

    perfBtn.disabled = false;
    perfBtn.textContent = 'Run Benchmark';
  });
});

// ===== Demo 4: Multilingual Segmentation =====
const segResult = document.getElementById('seg-result');

function showSegmentation(text) {
  const font = '16px Inter, system-ui, sans-serif';

  const t0 = performance.now();
  const prepared = prepareWithSegments(text, font);
  const prepTime = performance.now() - t0;

  const t1 = performance.now();
  const result = layoutWithLines(prepared, 400, 24);
  const layoutTime = performance.now() - t1;

  const lines = result.lines.map((l, i) => `  Line ${i + 1}: "${l.text}" (${l.width.toFixed(1)}px)`).join('\n');

  segResult.style.display = 'block';
  segResult.textContent =
    `Input: "${text}"\n\n` +
    `Lines at 400px width:\n${lines}\n\n` +
    `prepare(): ${prepTime.toFixed(3)} ms\n` +
    `layout():  ${layoutTime.toFixed(4)} ms\n` +
    `Total lines: ${result.lines.length}`;
}

document.querySelectorAll('[id^="seg-"]').forEach(btn => {
  if (btn.id === 'seg-result') return;
  btn.addEventListener('click', () => {
    showSegmentation(btn.dataset.text);
  });
});
