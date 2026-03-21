/**
 * Render passage text with highlight spans for annotations.
 * Handles overlapping annotations by splitting text into segments
 * at annotation boundaries.
 *
 * @param {string} text - The plain passage text
 * @param {Array} annotations - Annotation objects
 * @param {Array|null} visibleAuthors - If provided, only render these authors' annotations
 * @returns {string} HTML string
 */
export function renderPassage(text, annotations, visibleAuthors = null) {
  const filtered = visibleAuthors
    ? annotations.filter(a => visibleAuthors.includes(a.author))
    : annotations;

  if (filtered.length === 0) {
    return escapeHtml(text);
  }

  // Collect all boundary points
  const points = new Set([0, text.length]);
  for (const ann of filtered) {
    points.add(Math.max(0, ann.start));
    points.add(Math.min(text.length, ann.end));
  }
  const sorted = [...points].sort((a, b) => a - b);

  let html = '';
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    const segText = escapeHtml(text.slice(segStart, segEnd));

    // Find all annotations covering this segment
    const covering = filtered.filter(a => a.start <= segStart && a.end >= segEnd);

    if (covering.length === 0) {
      html += segText;
    } else {
      // Nest spans for overlapping annotations (outermost first)
      let wrapped = segText;
      for (const ann of covering) {
        wrapped = `<span class="highlight" data-id="${escapeAttr(ann.id)}" data-colour="${ann.colour}">${wrapped}</span>`;
      }
      html += wrapped;
    }
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}
