# Portfolio

Static site, mobile-first. SASS → `dist/css/main.css`. Deploy via `gh-pages`.

## Commands

```bash
npm run sass      # watch SCSS
npm test          # jest
npm run deploy    # publish dist/ to gh-pages
```

## Add a recipe

Requires `ANTHROPIC_API_KEY` in `.env` (only used as fallback when a page has no schema.org markup).

```bash
node scripts/ingest-recipe.js <url>
git add dist/data/recipes.json && git commit -m "add recipe: <title>"
npm run deploy
```

Fetches the URL, extracts via schema.org (or Claude fallback), appends to `dist/data/recipes.json`.

### Bot-blocked sources

Some sites (Cloudflare-protected — Food & Wine, Allrecipes, Serious Eats, etc.) refuse `node-fetch` and serve a JS challenge page. In that case, save the page from your browser and pass the file directly:

1. Open the recipe URL in your browser.
2. DevTools (⌥⌘I / F12) → **Elements** tab → right-click the `<html>` tag → **Copy** → **Copy outerHTML**.
3. Save as `recipe.html` (any path).
4. Run with `--html-file`:

   ```bash
   node scripts/ingest-recipe.js --html-file recipe.html <url>
   ```

The URL is still required as the recipe's source identifier; only the network fetch is skipped.
