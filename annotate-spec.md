# Annotate: Serverless Close Reading and Annotation Tool

## Project Summary

A zero-infrastructure, client-side web application that lets educators share passages of text for close reading via a link or QR code. Students scan the code, annotate the text (highlight + marginalia notes), and share their annotated version back as a new link. Annotations can chain: a teacher or peer can open an annotated link, add their own layer, and pass it on.

All data lives in the URL fragment. No server, no accounts, no storage, no sign-up.

## Core Concept

Follows the same architectural pattern as [Ziptable](https://ziptbl.com/): compress structured data with pako (deflate), base64url-encode it, and place it after the `#` in the URL. The browser never sends the fragment to the server, so the data stays client-side. The app is a static site.

---

## User Flows

### Flow 1: Teacher Creates a Passage

1. Teacher lands on the home page.
2. Teacher pastes a passage of text into a large text input area (or types directly).
3. Optionally adds a title and a brief instruction/prompt (e.g., "Identify the rhetorical devices in this passage").
4. Clicks "Create Link".
5. App compresses and encodes `{title, prompt, text}` into the URL fragment.
6. App displays:
   - The full shareable URL.
   - A "Copy Link" button.
   - A QR code (downloadable as PNG).
   - A compression/capacity meter showing how much URL budget is used (see Constraints section).
7. Teacher shares the link or QR code with students via any channel (projected on screen, printed on handout, dropped in LMS, emailed, etc.).

### Flow 2: Student Annotates

1. Student opens the link (scanned QR, clicked link, etc.).
2. App decompresses the URL fragment and renders:
   - The passage title and prompt (if provided) at the top.
   - The full passage text in a clean, readable layout.
   - An annotation sidebar/panel (or inline marginalia, see UI section).
3. Student enters their name (stored in sessionStorage for convenience, not required).
4. Student selects text to highlight. On selection, a small tooltip appears with:
   - A colour picker (3-4 preset colours, no custom).
   - A "Add Note" text input.
   - A "Save" button.
5. Saved highlights render as coloured background spans in the text. Corresponding notes appear in a margin/sidebar, visually connected to their highlight.
6. Student can delete or edit their own annotations.
7. At any point, the URL fragment updates live to include annotations. The student can:
   - Click "Share" to copy the updated link.
   - Click "Download QR" to get a QR code of the annotated version.
   - Click "Email Link" to open a `mailto:` link with the URL pre-filled in the body.

### Flow 3: Chained / Layered Annotations

1. A recipient (teacher or another student) opens an annotated link.
2. Existing annotations render as read-only highlights with visible notes and author attribution.
3. The new reader can add their own annotation layer on top:
   - Their highlights render in a distinguishable style (different default colour, labelled with their name).
   - The data model supports multiple authors.
4. When they share, the new URL contains the original text + all annotation layers.
5. This is infinitely chainable (within URL length limits).

### Flow 4: Teacher Reviews

1. Teacher opens a student's annotated link.
2. All student annotations are visible.
3. Teacher can:
   - Add their own annotations as feedback (a response layer).
   - Toggle annotation layers on/off by author (filter/visibility toggle).
   - Download a summary of all annotations as a simple text/CSV export.

---

## Data Model

All data is serialised as JSON, compressed with pako (deflate), and base64url-encoded into the URL fragment.

```json
{
  "v": 1,
  "title": "Optional passage title",
  "prompt": "Optional teacher instruction",
  "text": "The full passage text as a plain string.",
  "annotations": [
    {
      "id": "a1b2c3",
      "author": "Student Name",
      "start": 142,
      "end": 198,
      "colour": 1,
      "note": "This metaphor suggests..."
    }
  ]
}
```

### Field Notes

- `v`: Schema version number for future-proofing.
- `start` and `end`: Character offsets into `text`. These are the simplest anchoring method for plain text and avoid DOM dependency.
- `colour`: Integer index into a preset palette (0-3), not a hex string, to save bytes.
- `id`: Short random string for annotation identity (6 chars). Used for edit/delete operations client-side.
- `author`: Free text string. Keep short to save URL space.

### Compression Strategy

1. Serialise the data model to JSON.
2. Compress with pako `deflate` (raw, not gzip, to save the header bytes).
3. Encode to base64url (URL-safe base64: `+` becomes `-`, `/` becomes `_`, no padding `=`).
4. Set as URL fragment: `https://domain.com/#<encoded_data>`.

On load, reverse the process: read fragment, base64url-decode, pako `inflate`, JSON parse.

---

## Constraints and Mitigations

### QR Code Capacity

QR Version 40 (largest standard) holds approximately:
- 4,296 alphanumeric characters
- 2,953 bytes (binary mode)

A 500-word passage (~3,000 raw characters) compresses to roughly 1,500-2,000 base64url characters. Adding the domain, path, and `#` uses ~30 characters. That leaves room for annotations, but it's tight.

**Mitigations (implement all):**

1. **Compression meter**: Show a visual gauge on both the create and annotate screens. Use three zones:
   - Green (0-3,000 chars): Comfortable for QR and all sharing methods.
   - Amber (3,000-5,000 chars): QR may not scan reliably on all devices. Link sharing still works perfectly.
   - Red (5,000+ chars): QR not recommended. Link still works in browsers (most support fragments up to ~64KB).
2. **QR code auto-hide**: If the URL exceeds 4,000 characters, hide the QR option and show a message: "This passage is too long for a QR code. Use the link instead."
3. **URL shortener option**: Offer a "Shorten URL" button (using TinyURL or similar public API) with a clear privacy warning, exactly as Ziptable does. Short URLs are QR-friendly but introduce a third-party dependency.
4. **Character budget guidance**: On the create screen, show a live count: "~X words / approximately Y characters in link / QR: OK/Too long".

### URL Length Limits

- Browsers: Chrome, Firefox, Safari all support fragments well beyond 64KB. Not a practical concern.
- Sharing platforms: Some apps (Slack, Teams, SMS) may truncate very long URLs. The compression meter addresses this.
- Email: Most email clients handle long URLs if they're a single unbroken string. The `mailto:` link should encode the URL properly.

### Text Anchoring Robustness

Character offsets are fragile if the underlying text changes. Since the text is immutable within a single link (it's encoded in the URL), this is not a problem. The text is always identical for all readers of the same link.

---

## UI / UX Specification

### General Principles

- Mobile-first. Most students will scan a QR code on a phone.
- Minimal chrome. The passage text should dominate the screen.
- Accessible. Sufficient colour contrast on highlights. Notes accessible via tap/click, not hover-only.
- Fast. No framework overhead. Vanilla JS or a lightweight framework (Preact, if needed). The entire app should be a single HTML file or a tiny static bundle.

### Screens

#### 1. Home / Create Screen

- Large textarea for pasting text.
- Optional "Title" and "Prompt" fields above the textarea (collapsed by default, expandable).
- "Create Link" button (primary action).
- Below the button, the output area appears after creation:
  - Full URL in a read-only input with "Copy" button.
  - QR code (rendered via a client-side library, e.g., `qrcode.js` or `qr-creator`).
  - "Download QR as PNG" button.
  - Compression meter.

#### 2. Annotate / Read Screen

Activates when the URL contains a fragment.

- **Header area**: Title (if set) and prompt (if set), styled distinctly from the passage.
- **Name input**: Small persistent input at the top: "Your name:" with a text field. Value saved to sessionStorage so it persists across annotations in the same session.
- **Passage area**: The passage text rendered in a clean serif font, with generous line-height and margins. Highlighted spans rendered inline with coloured backgrounds.
- **Annotation interaction**:
  - Select text to trigger a floating toolbar (appears near the selection).
  - Toolbar contains: 3-4 colour swatches (small circles, click to select), a text input for the note, and "Save" / "Cancel" buttons.
  - On save, the highlight appears immediately. The note appears in the margin area.
- **Margin / sidebar notes**:
  - On desktop (>768px): A right-hand sidebar showing notes as cards, visually linked to their highlights (e.g., with a connecting line or matching background tint). Each card shows the author name, the highlighted text snippet (truncated), and the note.
  - On mobile (<768px): Notes appear as expandable cards below the passage, grouped by position. Tapping a highlight scrolls to / expands its note. Tapping a note scrolls to its highlight.
- **Author filter**: If multiple authors have annotations, show toggles (pill buttons) at the top to show/hide each author's layer.
- **Share bar** (sticky bottom on mobile, fixed sidebar section on desktop):
  - "Copy Link" button (always available, copies current URL with all annotations).
  - "Download QR" button (hidden if URL too long).
  - "Email Link" button (opens `mailto:?subject=Annotated: {title}&body={url}`).
  - "Export Notes" button: Downloads a simple text file or CSV with columns: Highlighted Text | Note | Author | Position.

#### 3. Visual Design Direction

- Clean, minimal, slightly warm. Think: a well-designed reading app, not a SaaS dashboard.
- Off-white background (#FAFAF7 or similar), dark text (#1a1a1a).
- Serif font for the passage (e.g., system Georgia, or loaded Charter/Lora).
- Sans-serif for UI elements (system font stack).
- Highlight palette: 4 muted colours that are distinct but not garish. Suggestions:
  - Yellow: `#FFF3B0` (classic highlighter)
  - Blue: `#B8D4E3`
  - Green: `#C2E0C6`
  - Pink: `#F5C6CB`
- Minimal borders, soft shadows, rounded corners on cards and buttons.

---

## Tech Stack

- **Static site**: Single page application. Deployable on Cloudflare Pages (Leon already uses this for client work).
- **No framework required**: Vanilla JS is fine. If a framework helps with reactivity (annotation state management), Preact or Alpine.js are acceptable. Keep the bundle tiny.
- **Compression**: [pako](https://github.com/nicholasgee/pako) (widely used, small, reliable deflate implementation).
- **QR generation**: [qr-creator](https://github.com/nicholasgee/QR-Code-generator) or [qrcode.js](https://github.com/nicholasgee/qrcodejs). Must support PNG export/download.
- **No build step required**: If using vanilla JS, the app can be a single `index.html` with inline or adjacent JS/CSS. If using a build step, keep it simple (Vite).
- **Deployment**: Cloudflare Pages via Git push. Custom domain optional.

---

## Implementation Notes for Claude Code

### Priority Order

1. **Core encode/decode loop**: Get the compress-to-fragment and decompress-from-fragment cycle working first. This is the foundation. Test with a 500-word passage.
2. **Create screen**: Paste text, generate URL, display QR.
3. **Read screen**: Detect fragment, decompress, render passage.
4. **Annotation**: Text selection, highlight creation, note input, state management, URL update.
5. **Sharing**: Copy link, QR download, mailto, export.
6. **Chaining**: Multiple author support, author filters, layered display.
7. **Polish**: Compression meter, mobile responsiveness, visual design, edge cases.

### Key Libraries to Install

```bash
npm install pako        # compression
npm install qrcode      # QR code generation (or use a CDN)
```

Or use CDN links if building as a single HTML file:
```
https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js
https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js
```

### Edge Cases to Handle

- Empty text submission: Prevent with validation.
- Very long passages: Show compression meter warning, hide QR if over limit.
- Overlapping highlights: Allow them. Render with nested spans or use a more sophisticated approach (e.g., mark.js-style painting). Overlapping highlights from different authors should blend colours (CSS `mix-blend-mode: multiply` on highlight spans can achieve this).
- Special characters in text: JSON handles Unicode. Ensure the base64url encoding is clean.
- Fragment not present on load: Show the create screen.
- Malformed/corrupted fragment: Show a friendly error with a link back to the create screen.
- Mobile text selection: Test carefully. Mobile browsers handle text selection differently. The floating toolbar should appear after `selectionchange` or `mouseup`/`touchend` events.

### Testing Checklist

- [ ] Paste 100-word passage, generate link, open in new tab: text renders correctly.
- [ ] Paste 500-word passage, check QR scans on iPhone and Android.
- [ ] Add 5 annotations, share link, open: all annotations visible and correctly positioned.
- [ ] Chain: Person A annotates, shares. Person B opens, adds annotations, shares. Person A opens: both layers visible.
- [ ] Compression meter accurately reflects URL length.
- [ ] QR hidden when URL exceeds 4,000 chars.
- [ ] Mobile: annotation workflow works on iOS Safari and Android Chrome.
- [ ] Export: CSV/text download contains all annotations with correct text snippets.
- [ ] Mailto: link opens email client with correct subject and body.

---

## Naming

Working name: **Annotate** (or **Marginalia**, **Gloss**, **CloseRead** — Leon to decide).

Domain: TBD. Could live as a subdirectory or subdomain of an existing site, or on its own domain.

---

## Out of Scope (for v1)

- Rich text or Markdown in passages (plain text only).
- Image annotation.
- Real-time collaboration (this is async by design).
- User accounts or authentication.
- Server-side storage or database.
- PDF or DOCX import (paste text only for now).
- Annotation types beyond highlight + note (no underline, strikethrough, emoji reactions, etc.).

## Possible v2 Features

- Markdown support in passages (bold, italic, headings).
- "Compare" mode: side-by-side view of two annotated versions of the same passage.
- Classroom dashboard: teacher pastes a passage, gets a unique "collect" page where students submit their annotated links, and the teacher sees all annotations aggregated.
- Import from URL: paste a webpage URL, app fetches the text content for annotation.
- Annotation templates: teacher pre-defines annotation categories (e.g., "Language Feature", "Authorial Intent", "Personal Response") that students select from when annotating.
