import { encode, decode } from './codec.js';
import { createState, addAnnotation, removeAnnotation, addReply, getAuthors } from './state.js';
import { renderPassage } from './renderer.js';
import { jsPDF } from 'jspdf';

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
const shareEmailBtn = document.getElementById('share-email-btn');
const shareExportBtn = document.getElementById('share-export-btn');

// ===== App state =====
let appState = null;
let selectedColour = 0;
let selectionRange = null; // { start, end }
let visibleAuthors = null; // null = show all

const COLOURS = ['#FFF3B0', '#B8D4E3', '#C2E0C6', '#F5C6CB'];

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
    meterLabel.textContent = 'Short link — easy to share';
  } else if (len < 5000) {
    meterFill.classList.add('amber');
    meterLabel.textContent = 'Medium link — works in most places';
  } else {
    meterFill.classList.add('red');
    meterLabel.textContent = 'Long link — may be truncated by some apps';
  }
}

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
        visibleAuthors = [author];
      } else if (visibleAuthors.includes(author)) {
        visibleAuthors = visibleAuthors.filter(a => a !== author);
        if (visibleAuthors.length === 0) visibleAuthors = null;
      } else {
        visibleAuthors = [...visibleAuthors, author];
      }
      renderRead();
    });
  });
}

function renderMarginNotes(annotations) {
  const currentName = nameInput.value.trim() || '';
  const notesWithNotes = annotations.filter(a => a.note).sort((a, b) => a.start - b.start);

  marginNotes.innerHTML = notesWithNotes.map(a => {
    const snippet = appState.text.slice(a.start, Math.min(a.end, a.start + 40));
    const canEdit = a.author === currentName;
    const replies = (a.replies || []).map(r => `
      <div class="reply">
        <span class="reply-author">${escapeHtml(r.author)}</span>
        <span class="reply-text">${escapeHtml(r.text)}</span>
      </div>`).join('');
    return `
      <div class="note-card" data-id="${a.id}" style="border-left: 3px solid ${COLOURS[a.colour] || COLOURS[0]}">
        <div class="note-author">${escapeHtml(a.author)}</div>
        <div class="note-snippet">"${escapeHtml(snippet)}${a.end - a.start > 40 ? '…' : ''}"</div>
        <div class="note-body">${escapeHtml(a.note)}</div>
        ${replies ? `<div class="replies">${replies}</div>` : ''}
        <div class="note-actions">
          <button class="reply-toggle" data-id="${a.id}">Reply</button>
          ${canEdit ? `<button class="delete-note" data-id="${a.id}">Delete</button>` : ''}
        </div>
        <div class="reply-form hidden" data-id="${a.id}">
          <input type="text" class="reply-input" placeholder="Write a reply…" maxlength="300">
          <button class="reply-submit btn-primary btn-small" data-id="${a.id}">Send</button>
        </div>
      </div>`;
  }).join('');

  positionMarginNotes(notesWithNotes);

  marginNotes.querySelectorAll('.delete-note').forEach(btn => {
    btn.addEventListener('click', () => {
      appState = removeAnnotation(appState, btn.dataset.id);
      renderRead();
    });
  });

  marginNotes.querySelectorAll('.reply-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = marginNotes.querySelector(`.reply-form[data-id="${btn.dataset.id}"]`);
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        form.querySelector('.reply-input').focus();
      }
    });
  });

  marginNotes.querySelectorAll('.reply-submit').forEach(btn => {
    const form = btn.closest('.reply-form');
    const input = form.querySelector('.reply-input');
    const submitReply = () => {
      const text = input.value.trim();
      if (!text) return;
      const author = nameInput.value.trim() || 'Anonymous';
      appState = addReply(appState, btn.dataset.id, { author, text });
      renderRead();
    };
    btn.addEventListener('click', submitReply);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitReply();
      }
    });
  });
}

function positionMarginNotes(annotations) {
  const containerTop = passageText.getBoundingClientRect().top;

  let lastBottom = 0;
  for (const ann of annotations) {
    const highlightEl = passageText.querySelector(`.highlight[data-id="${ann.id}"]`);
    const cardEl = marginNotes.querySelector(`.note-card[data-id="${ann.id}"]`);
    if (!highlightEl || !cardEl) continue;

    const highlightTop = highlightEl.getBoundingClientRect().top - containerTop;
    const top = Math.max(highlightTop, lastBottom);
    cardEl.style.top = `${top}px`;

    lastBottom = top + cardEl.offsetHeight + 8;
  }
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
document.addEventListener('mouseup', handleSelectionEnd);
document.addEventListener('touchend', handleSelectionEnd);

function handleSelectionEnd() {
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

  const toolbarHeight = toolbar.offsetHeight;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceBelow < toolbarHeight + 16) {
    toolbar.style.top = `${rect.top - toolbarHeight - 8}px`;
  } else {
    toolbar.style.top = `${rect.bottom + 8}px`;
  }
  toolbar.style.left = `${Math.max(8, rect.left)}px`;
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
toolbar.querySelector('.swatch')?.classList.add('selected');

function submitAnnotation() {
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
}

saveAnnotationBtn.addEventListener('click', submitAnnotation);

noteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    submitAnnotation();
  }
});

cancelAnnotationBtn.addEventListener('click', hideToolbar);

// ===== SHARE BAR =====
shareCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href);
  shareCopyBtn.textContent = 'Copied!';
  setTimeout(() => { shareCopyBtn.textContent = 'Copy Link'; }, 1500);
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
  exportPdf(appState);
});

function exportPdf(state) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  const COLOUR_RGB = [[255, 243, 176], [184, 212, 227], [194, 224, 198], [245, 198, 203]];

  function addHeader() {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a1a1a');
    doc.text('read', margin, y);
    const readW = doc.getTextWidth('read');
    doc.setTextColor('#999999');
    doc.text('/', margin + readW, y);
    const slashW = doc.getTextWidth('/');
    doc.setTextColor('#1a1a1a');
    doc.text('closer', margin + readW + slashW, y);
    y += 3;
    doc.setDrawColor('#e0ddd8');
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  }

  function addFooter() {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#999999');
    doc.text('readcloser.com', pageW / 2, pageH - 10, { align: 'center' });
  }

  function checkPage(needed) {
    if (y + needed > pageH - margin) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  }

  addHeader();

  function writeText(text, x, maxW, opts = {}) {
    const fontSize = opts.fontSize || 10;
    const style = opts.style || 'normal';
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(opts.color || '#1a1a1a');
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = fontSize * 0.45;
    for (const line of lines) {
      checkPage(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
    return lines.length;
  }

  if (state.title) {
    writeText(state.title, margin, contentW, { fontSize: 18, style: 'bold' });
    y += 3;
  }

  if (state.prompt) {
    writeText(state.prompt, margin, contentW, { fontSize: 11, style: 'italic', color: '#666666' });
    y += 3;
  }

  writeText('Annotations', margin, contentW, { fontSize: 13, style: 'bold' });
  y += 2;

  doc.setDrawColor('#e0ddd8');
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const sorted = [...state.annotations].filter(a => a.note).sort((a, b) => a.start - b.start);

  for (const ann of sorted) {
    const snippet = state.text.slice(ann.start, ann.end);
    const colourIdx = ann.colour || 0;

    checkPage(25);

    const rgb = COLOUR_RGB[colourIdx] || COLOUR_RGB[0];
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(margin, y - 3, 3, 14, 'F');

    const indentX = margin + 6;
    const indentW = contentW - 6;

    writeText(ann.author, indentX, indentW, { fontSize: 8, style: 'bold', color: '#666666' });
    y += 0.5;

    const truncated = snippet.length > 200 ? snippet.slice(0, 200) + '…' : snippet;
    writeText(`"${truncated}"`, indentX, indentW, { fontSize: 9, style: 'italic', color: '#555555' });
    y += 1;

    writeText(ann.note, indentX, indentW, { fontSize: 10 });

    if (ann.replies && ann.replies.length > 0) {
      y += 1.5;
      for (const reply of ann.replies) {
        checkPage(10);
        const replyX = indentX + 4;
        const replyW = indentW - 4;

        doc.setDrawColor('#cccccc');
        doc.line(indentX + 1, y - 2.5, indentX + 1, y + 2);

        writeText(`${reply.author}:`, replyX, replyW, { fontSize: 8, style: 'bold', color: '#666666' });
        writeText(reply.text, replyX, replyW, { fontSize: 9, color: '#333333' });
        y += 1;
      }
    }

    y += 6;
  }

  addFooter();

  const filename = state.title
    ? `${state.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}-annotations.pdf`
    : 'annotations.pdf';
  doc.save(filename);
}

// ===== HELPERS =====
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

// ===== GO =====
init();
