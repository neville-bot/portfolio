# Portfolio — Domain Glossary

Vocabulary for the recipe ingestion pipeline. Use these terms exactly in code, comments, and discussion.

- **Recipe** — the canonical persisted shape: `{ id, title, ingredients[], steps[] }`. `title` is non-empty; `ingredients` and `steps` are non-null arrays of strings (possibly empty). This is the contract between the CLI writer and the page renderer.
- **Extraction** — the `{ title, ingredients, steps }` triple produced by reading a page. May contain nulls. Not yet a Recipe.
- **Extractor** — a module that turns HTML into an Extraction. Currently two: the schema.org reader and the Claude reader.
- **Source** — which Extractor produced an Extraction. Values: `'schema' | 'claude'`.
- **Ingest** — the orchestration: fetch URL → run Extractors → normalize to Recipe → persist.
