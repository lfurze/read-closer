import { encode, decode } from './codec.js';
import { createState, addAnnotation, removeAnnotation, getAuthors } from './state.js';
import { renderPassage } from './renderer.js';
import QRCode from 'qrcode';

// ===== DOM refs =====
const createScreen = document.getElementById('create-screen');
const readScreen = document.getElementById('read-screen');
const toggleOptions = document.getElementById('toggle-options');
const optionalFields = document.getElementById('optional-fields');
const titleInput = document.getElementById('title-input');
const promptInput = document.getElementById('prompt-input');
const textInput = document.getElementById('text-input');
const budgetText = document.getElementById('budget-text');
const createBtn = document.getElementById('create-btn');
const outputArea = document.getElementById('output-area');
const urlOutput = document.getElementById('url-output');
const copyBtn = document.getElementById('copy-btn');
const qrCanvas = document.getElementById('qr-canvas');
const qrContainer = document.getElementById('qr-container');
const qrWarning = document.getElementById('qr-warning');
const downloadQrBtn = document.getElementById('download-qr-btn');
const meterFill = document.getElementById('meter-fill');
const meterLabel = document.getElementById('meter-label');

const passageTitle = document.getElementById('passage-title');
const passagePrompt = document.getElementById('passage-prompt');
const nameInput = document.getElementById('name-input');
const passageText = document.getElementById('passage-text');
const marginNotes = document.getElementById('margin-notes');
const authorFilters = document.getElementById('author-filters');
const toolbar = document.getElementById('annotation-toolbar');
const noteInput = document.getElementById('note-input');
const saveAnnotationBtn = document.getElementById('save-annotation-btn');
const cancelAnnotationBtn = document.getElementById('cancel-annotation-btn');
const shareCopyBtn = document.getElementById('share-copy-btn');
const shareQrBtn = document.getElementById('share-qr-btn');
const shareEmailBtn = document.getElementById('share-email-btn');
const shareExportBtn = document.getElementById('share-export-btn');

// ===== App state =====
let appState = null;
let selectedColour = 0;
let selectionRange = null; // { start, end }
let visibleAuthors = null; // null = show all

const COLOURS = ['#FFF3B0', '#B8D4E3', '#C2E0C6', '#F5C6CB'];
const QR_LIMIT = 4000;

// ===== Init =====
function init() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    try {
      const data = decode(hash);
      appState = createState(data);
      showReadScreen();
    } catch {
      alert('Could not read this link. It may be corrupted.');
      showCreateScreen();
    }
  } else {
    showCreateScreen();
  }

  // Restore name from sessionStorage
  const savedName = sessionStorage.getItem('annotate-name');
  if (savedName) nameInput.value = savedName;
  nameInput.addEventListener('input', () => {
    sessionStorage.setItem('annotate-name', nameInput.value);
  });
}

// ===== CREATE SCREEN =====
function showCreateScreen() {
  createScreen.classList.remove('hidden');
  readScreen.classList.add('hidden');
}

toggleOptions.addEventListener('click', () => {
  optionalFields.classList.toggle('hidden');
  toggleOptions.textContent = optionalFields.classList.contains('hidden')
    ? '+ Title & Prompt'
    : '− Title & Prompt';
});

textInput.addEventListener('input', () => {
  const text = textInput.value.trim();
  createBtn.disabled = text.length === 0;

  const words = text ? text.split(/\s+/).length : 0;
  const data = buildCreateData();
  const encoded = data ? encode(data) : '';
  const urlLen = encoded.length + window.location.origin.length + window.location.pathname.length + 1;
  budgetText.textContent = `${words} words · ~${urlLen} chars in link`;
});

function buildCreateData() {
  const text = textInput.value.trim();
  if (!text) return null;
  const data = { v: 1, text };
  const title = titleInput.value.trim();
  const prompt = promptInput.value.trim();
  if (title) data.title = title;
  if (prompt) data.prompt = prompt;
  return data;
}

createBtn.addEventListener('click', () => {
  const data = buildCreateData();
  if (!data) return;

  const encoded = encode(data);
  const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

  urlOutput.value = url;
  outputArea.classList.remove('hidden');

  updateMeter(url.length);
  renderQr(url);
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(urlOutput.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
});

function updateMeter(len) {
  const pct = Math.min((len / 5000) * 100, 100);
  meterFill.style.width = `${pct}%`;
  meterFill.classList.remove('green', 'amber', 'red');
  if (len < 3000) {
    meterFill.classList.add('green');
    meterLabel.textContent = 'QR-friendly';
  } else if (len < 5000) {
    meterFill.classList.add('amber');
    meterLabel.textContent = 'QR may not scan on all devices';
  } else {
    meterFill.classList.add('red');
    meterLabel.textContent = 'Link only — too long for QR';
  }
}

async function renderQr(url) {
  if (url.length > QR_LIMIT) {
    qrContainer.classList.add('hidden');
    qrWarning.classList.remove('hidden');
    return;
  }
  qrWarning.classList.add('hidden');
  qrContainer.classList.remove('hidden');
  await QRCode.toCanvas(qrCanvas, url, { width: 200, margin: 2 });
}

downloadQrBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'annotate-qr.png';
  link.href = qrCanvas.toDataURL('image/png');
  link.click();
});

// ===== READ SCREEN =====
function showReadScreen() {
  createScreen.classList.add('hidden');
  readScreen.classList.remove('hidden');
  renderRead();
}

function renderRead() {
  if (!appState) return;

  passageTitle.textContent = appState.title || '';
  passageTitle.classList.toggle('hidden', !appState.title);
  passagePrompt.textContent = appState.prompt || '';
  passagePrompt.classList.toggle('hidden', !appState.prompt);

  // Author filters
  const authors = getAuthors(appState);
  renderAuthorFilters(authors);

  // Passage with highlights
  const filteredAnnotations = visibleAuthors
    ? appState.annotations.filter(a => visibleAuthors.includes(a.author))
    : appState.annotations;
  passageText.innerHTML = renderPassage(appState.text, filteredAnnotations);

  // Margin notes
  renderMarginNotes(filteredAnnotations);

  // Update URL
  updateUrl();
}

function renderAuthorFilters(authors) {
  if (authors.length <= 1) {
    authorFilters.innerHTML = '';
    return;
  }
  authorFilters.innerHTML = authors.map(name => {
    const active = !visibleAuthors || visibleAuthors.includes(name);
    return `<button class="author-pill ${active ? 'active' : ''}" data-author="${escapeAttr(name)}">${escapeHtml(name)}</button>`;
  }).join('');

  authorFilters.querySelectorAll('.author-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const author = btn.dataset.author;
      if (!visibleAuthors) {
        // First click: show only this author
        visibleAuthors = [author];
      } else if (visibleAuthors.includes(author)) {
        visibleAuthors = visibleAuthors.filter(a => a !== author);
        if (visibleAuthors.length === 0) visibleAuthors = null; // show all
      } else {
        visibleAuthors = [...visibleAuthors, author];
      }
      renderRead();
    });
  });
}

function renderMarginNotes(annotations) {
  const currentName = nameInput.value.trim() || '';
  marginNotes.innerHTML = annotations
    .filter(a => a.note)
    .sort((a, b) => a.start - b.start)
    .map(a => {
      const snippet = appState.text.slice(a.start, Math.min(a.end, a.start + 40));
      const canEdit = a.author === currentName;
      return `
        <div class="note-card" data-id="${a.id}" style="border-left: 3px solid ${COLOURS[a.colour] || COLOURS[0]}">
          <div class="note-author">${escapeHtml(a.author)}</div>
          <div class="note-snippet">"${escapeHtml(snippet)}${a.end - a.start > 40 ? '…' : ''}"</div>
          <div class="note-body">${escapeHtml(a.note)}</div>
          ${canEdit ? `<div class="note-actions"><button class="delete-note" data-id="${a.id}">Delete</button></div>` : ''}
        </div>`;
    }).join('');

  marginNotes.querySelectorAll('.delete-note').forEach(btn => {
    btn.addEventListener('click', () => {
      appState = removeAnnotation(appState, btn.dataset.id);
      renderRead();
    });
  });
}

function updateUrl() {
  const data = { v: appState.v, text: appState.text };
  if (appState.title) data.title = appState.title;
  if (appState.prompt) data.prompt = appState.prompt;
  if (appState.annotations.length > 0) data.annotations = appState.annotations;
  const encoded = encode(data);
  window.history.replaceState(null, '', `#${encoded}`);
}

// ===== ANNOTATION INTERACTION =====
let toolbarSelection = null;

document.addEventListener('mouseup', handleSelectionEnd);
document.addEventListener('touchend', handleSelectionEnd);

function handleSelectionEnd() {
  // Delay to let selection finalise
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !passageText.contains(sel.anchorNode)) {
      return;
    }
    const range = getCharacterOffsets(sel);
    if (!range || range.start === range.end) return;

    selectionRange = range;
    positionToolbar(sel);
  }, 10);
}

function getCharacterOffsets(sel) {
  // Walk the passage text node to find character offsets
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(passageText);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  preRange.setEnd(range.endContainer, range.endOffset);
  const end = preRange.toString().length;

  return { start, end };
}

function positionToolbar(sel) {
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  toolbar.classList.remove('hidden');
  toolbar.style.top = `${rect.bottom + window.scrollY + 8}px`;
  toolbar.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
  noteInput.value = '';
  noteInput.focus();
}

function hideToolbar() {
  toolbar.classList.add('hidden');
  selectionRange = null;
  window.getSelection()?.removeAllRanges();
}

// Colour swatches
toolbar.querySelectorAll('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedColour = parseInt(btn.dataset.colour, 10);
    toolbar.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    btn.classList.add('selected');
  });
});
// Default selection
toolbar.querySelector('.swatch')?.classList.add('selected');

saveAnnotationBtn.addEventListener('click', () => {
  if (!selectionRange) return;
  const author = nameInput.value.trim() || 'Anonymous';
  appState = addAnnotation(appState, {
    author,
    start: selectionRange.start,
    end: selectionRange.end,
    colour: selectedColour,
    note: noteInput.value.trim(),
  });
  hideToolbar();
  renderRead();
});

cancelAnnotationBtn.addEventListener('click', hideToolbar);

// ===== SHARE BAR =====
shareCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href);
  shareCopyBtn.textContent = 'Copied!';
  setTimeout(() => { shareCopyBtn.textContent = 'Copy Link'; }, 1500);
});

shareQrBtn.addEventListener('click', async () => {
  const url = window.location.href;
  if (url.length > QR_LIMIT) {
    alert('URL is too long for a QR code. Use the link instead.');
    return;
  }
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, { width: 300, margin: 2 });
  const link = document.createElement('a');
  link.download = 'annotate-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

shareEmailBtn.addEventListener('click', () => {
  const subject = encodeURIComponent(`Annotated: ${appState.title || 'Passage'}`);
  const body = encodeURIComponent(window.location.href);
  window.open(`mailto:?subject=${subject}&body=${body}`);
});

shareExportBtn.addEventListener('click', () => {
  if (!appState || appState.annotations.length === 0) {
    alert('No annotations to export.');
    return;
  }
  const lines = ['Highlighted Text\tNote\tAuthor\tStart\tEnd'];
  for (const a of appState.annotations) {
    const highlighted = appState.text.slice(a.start, a.end);
    lines.push(`${highlighted}\t${a.note}\t${a.author}\t${a.start}\t${a.end}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/tab-separated-values' });
  const link = document.createElement('a');
  link.download = 'annotations.tsv';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

// ===== HELPERS =====
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

// ===== GO =====
init();
