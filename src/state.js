/**
 * Create an app state object from decoded URL data.
 */
export function createState(data) {
  return {
    v: data.v || 1,
    title: data.title || '',
    prompt: data.prompt || '',
    text: data.text || '',
    annotations: data.annotations ? [...data.annotations] : [],
  };
}

/**
 * Add an annotation, returning a new state. Generates a 6-char random id.
 */
export function addAnnotation(state, { author, start, end, colour, note }) {
  const id = randomId();
  return {
    ...state,
    annotations: [...state.annotations, { id, author, start, end, colour, note }],
  };
}

/**
 * Remove an annotation by id, returning a new state.
 */
export function removeAnnotation(state, id) {
  return {
    ...state,
    annotations: state.annotations.filter(a => a.id !== id),
  };
}

/**
 * Update fields on an annotation by id, returning a new state.
 */
export function updateAnnotation(state, id, fields) {
  return {
    ...state,
    annotations: state.annotations.map(a =>
      a.id === id ? { ...a, ...fields } : a
    ),
  };
}

/**
 * Add a reply to an annotation by id, returning a new state.
 */
export function addReply(state, annotationId, { author, text }) {
  const id = randomId();
  return {
    ...state,
    annotations: state.annotations.map(a =>
      a.id === annotationId
        ? { ...a, replies: [...(a.replies || []), { id, author, text }] }
        : a
    ),
  };
}

/**
 * Get unique author names in annotation order (including reply authors).
 */
export function getAuthors(state) {
  const seen = new Set();
  const authors = [];
  for (const a of state.annotations) {
    if (!seen.has(a.author)) {
      seen.add(a.author);
      authors.push(a.author);
    }
    if (a.replies) {
      for (const r of a.replies) {
        if (!seen.has(r.author)) {
          seen.add(r.author);
          authors.push(r.author);
        }
      }
    }
  }
  return authors;
}

function randomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
