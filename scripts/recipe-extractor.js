const { extractFromSchema, extractWithClaude } = require('./ingest-recipe');

function isAcceptable(extraction) {
  return !!(
    extraction &&
    typeof extraction.title === 'string' &&
    extraction.title.trim().length > 0
  );
}

const defaultExtractors = [
  { name: 'schema', run: extractFromSchema },
  { name: 'claude', run: extractWithClaude },
];

async function extract(html, { extractors = defaultExtractors } = {}) {
  for (const { name, run } of extractors) {
    const result = await run(html);
    if (isAcceptable(result)) {
      return { recipe: result, source: name };
    }
  }
  return { recipe: null, source: null };
}

module.exports = { extract, isAcceptable, defaultExtractors };
