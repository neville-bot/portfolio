const cheerio = require('cheerio');
const slugifyLib = require('slugify');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

function findRecipeInData(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInData(item);
      if (found) return found;
    }
    return null;
  }
  if (data['@type'] === 'Recipe') return data;
  if (data['@graph']) return findRecipeInData(data['@graph']);
  return null;
}

function extractFromSchema(html) {
  if (!html || typeof html !== 'string') return null;
  const $ = cheerio.load(html);
  let result = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (result) return;
    try {
      const data = JSON.parse($(el).html());
      const recipe = findRecipeInData(data);
      if (!recipe) return;
      const steps = (recipe.recipeInstructions || [])
        .map(s => (typeof s === 'string' ? s : s.text || ''))
        .filter(Boolean);
      result = {
        title: recipe.name || null,
        ingredients: recipe.recipeIngredient || null,
        steps: steps.length ? steps : null,
      };
    } catch {}
  });
  return result;
}

async function extractWithClaude(html) {
  if (!html || typeof html !== 'string') return null;
  const Anthropic = require('@anthropic-ai/sdk');
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract the recipe from this page text. Return ONLY a JSON object with this exact shape and no other text:\n{"title":"string or null","ingredients":["string"] or null,"steps":["string"] or null}\n\nPage text:\n${text}`,
    }],
  });

  let parsed;
  try {
    parsed = JSON.parse(message.content[0].text);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed.ingredients !== null && !Array.isArray(parsed.ingredients)) ||
    (parsed.steps !== null && !Array.isArray(parsed.steps))
  ) {
    return null;
  }
  return parsed;
}

function slugify(title) {
  return slugifyLib(title, { lower: true, strict: true });
}

function loadRecipes(filepath) {
  if (!fs.existsSync(filepath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return [];
  }
}

function addRecipe(recipes, recipe) {
  if (recipes.some(r => r.id === recipe.id)) return recipes;
  return [...recipes, recipe];
}

function saveRecipes(filepath, recipes) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(recipes, null, 2));
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function main(url) {
  console.log(`Fetching ${url}...`);
  const html = await fetchPage(url);

  console.log('Trying schema.org extraction...');
  let extracted = extractFromSchema(html);

  if (!extracted || !extracted.title) {
    console.log('No schema found, falling back to Claude...');
    try {
      extracted = await extractWithClaude(html);
    } catch (err) {
      console.error(`Claude extraction failed: ${err.message}`);
      process.exit(1);
    }
  }

  if (!extracted || !extracted.title) {
    console.error('Could not extract recipe — title missing.');
    process.exit(1);
  }

  const id = slugify(extracted.title);
  const recipe = { id, title: extracted.title, ingredients: extracted.ingredients, steps: extracted.steps };

  const recipesPath = path.join(__dirname, '../dist/data/recipes.json');
  const recipes = loadRecipes(recipesPath);
  const updated = addRecipe(recipes, recipe);

  if (updated.length === recipes.length) {
    console.log(`Recipe "${recipe.title}" already exists (id: ${id}), skipping.`);
  } else {
    saveRecipes(recipesPath, updated);
    console.log(`Added "${recipe.title}" (id: ${id})`);
  }
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/ingest-recipe.js <url>');
    process.exit(1);
  }
  main(url).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fetchPage, main, extractFromSchema, extractWithClaude, slugify, loadRecipes, addRecipe, saveRecipes };
