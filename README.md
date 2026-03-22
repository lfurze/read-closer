# read/closer

A zero-infrastructure, client-side close reading and annotation tool. Teachers share passages via a link or QR code, students annotate them, and share their annotated version back — all without accounts, servers, or sign-ups.

**All data lives in the URL fragment.** Nothing is ever sent to a server.

Live at [readcloser.com](https://readcloser.com)

## How it works

1. **Teacher** pastes a passage, clicks "Create Link", and shares the URL or QR code
2. **Student** opens the link, highlights text, adds notes, and shares their annotated version
3. **Chaining** — anyone can open an annotated link, add their own layer, and pass it on
4. **Review** — toggle annotation layers by author, reply to annotations, export to PDF

## Technical approach

Structured data (passage text + annotations) is compressed with [pako](https://github.com/nicholasgee/pako) (raw deflate), base64url-encoded, and placed after the `#` in the URL. The browser never sends the fragment to the server, so everything stays client-side.

A 500-word passage compresses to roughly 1,500–2,000 characters in the URL — well within QR code and browser limits.

## Development

```bash
npm install
npm run dev       # Vite dev server on localhost:5173
npm test          # Run tests with Vitest
npm run build     # Production build to dist/
```

## Stack

- Vanilla JS — no framework
- [Vite](https://vite.dev) — dev server and build
- [Vitest](https://vitest.dev) — testing (jsdom)
- [pako](https://github.com/nicholasgee/pako) — compression
- [qrcode](https://github.com/soldair/node-qrcode) — QR generation
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

## Features

- Paste text, generate shareable link + QR code
- Highlight text with 4 colours, add margin notes
- Reply to annotations in threaded conversations
- Multiple annotation layers with per-author toggle
- Margin notes anchored alongside their highlights
- Compression meter showing QR/link capacity
- PDF export with full annotation details
- Mobile-first responsive design
- Keyboard shortcut: Cmd/Ctrl+Enter to submit

## License

[MIT](LICENSE) — Leon Furze
