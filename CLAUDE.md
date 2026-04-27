# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run sass      # Watch SCSS → dist/css/main.css (Dart Sass, Node 24 compatible)
npm run deploy    # Deploy dist/ to GitHub Pages via gh-pages
npm test          # Run Jest test suite (15 tests for the recipe ingestion CLI)
```

No lint command. HTML and JS in `dist/` are edited directly — no build step beyond SCSS compilation.

## Adding a Recipe

Requires `ANTHROPIC_API_KEY` in a `.env` file (see `.env.example`):

```bash
node scripts/ingest-recipe.js <url>
```

The CLI fetches the URL, extracts the recipe via schema.org markup (fast, free) or falls back to the Claude API, then appends it to `dist/data/recipes.json`. After running, commit `dist/data/recipes.json` and deploy.

## Architecture

Static portfolio site (no framework). Source SCSS compiles to `dist/css/main.css`; everything else in `dist/` is hand-authored and deployed directly.

### SCSS structure (`scss/`)

| File | Role |
|------|------|
| `main.scss` | Entry point, imports all modules |
| `_config.scss` | Variables (`#58bfee` primary, `#321660` secondary), responsive mixins, breakpoints (500px / 768px / 1170px) |
| `_menu.scss` | Hamburger overlay nav with 3D transforms and staggered item animations |
| `_recipes.scss` | Recipes page styles — dropdown, recipe body grid, ingredients/steps |
| `_mobile.scss` | Mobile overrides via the breakpoint mixins from `_config.scss` |

### JS

`dist/js/main.js` — 38 lines of vanilla JS, handles only the hamburger menu toggle. No framework, no build step.

`dist/recipes.html` contains an inline script that fetches `dist/data/recipes.json` at load time, populates the dropdown, and renders the selected recipe.

### Pages

Five static HTML pages in `dist/`: `index.html`, `about.html`, `work.html`, `contact.html`, `recipes.html`. All share the same header/nav/footer structure and load Inter (Google Fonts) and Font Awesome (CDN).

Layout uses CSS Grid (projects grid, about 3-col, recipe body 2-col) and Flexbox, collapsing responsively via the mixins in `_config.scss`.

### Recipe ingestion CLI (`scripts/`)

| File | Role |
|------|------|
| `scripts/ingest-recipe.js` | CLI + exported functions: `fetchPage`, `extractFromSchema`, `extractWithClaude`, `slugify`, `loadRecipes`, `addRecipe`, `saveRecipes`, `main` |
| `scripts/ingest-recipe.test.js` | Jest tests (15 tests) |

Recipe data is stored in `dist/data/recipes.json` as a JSON array: `[{ id, title, ingredients[], steps[] }]`. The file is committed to the repo and served as a static asset.
