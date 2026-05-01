function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(s => typeof s === 'string' && s.trim().length > 0)
    .map(s => s);
}

function normalize(extraction, { id }) {
  if (!extraction || typeof extraction.title !== 'string') return null;
  const title = extraction.title.trim();
  if (!title) return null;
  return {
    id,
    title,
    ingredients: normalizeStringArray(extraction.ingredients),
    steps: normalizeStringArray(extraction.steps),
  };
}

module.exports = { normalize };
