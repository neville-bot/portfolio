const slugifyLib = require('slugify');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { extractFromSchema, extractWithClaude } = require('./extractors');
require('dotenv').config();

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

async function main(url, { htmlFile, recipesPath } = {}) {
  const { extract } = require('./recipe-extractor');

  let html;
  if (htmlFile) {
    console.log(`Reading HTML from ${htmlFile} (source: ${url})...`);
    html = fs.readFileSync(htmlFile, 'utf8');
  } else {
    console.log(`Fetching ${url}...`);
    html = await fetchPage(url);
  }

  const { recipe: extracted, source } = await extract(html);
  if (!extracted) {
    console.error('Could not extract recipe — title missing.');
    process.exit(1);
  }
  console.log(`Extracted via ${source}`);

  const { normalize } = require('./recipe');
  const id = slugify(extracted.title);
  const recipe = normalize(extracted, { id });
  if (!recipe) {
    console.error('Could not extract recipe — title missing.');
    process.exit(1);
  }

  const targetPath = recipesPath || path.join(__dirname, '../dist/data/recipes.json');
  const recipes = loadRecipes(targetPath);
  const updated = addRecipe(recipes, recipe);

  if (updated.length === recipes.length) {
    console.log(`Recipe "${recipe.title}" already exists (id: ${id}), skipping.`);
  } else {
    saveRecipes(targetPath, updated);
    console.log(`Added "${recipe.title}" (id: ${id})`);
  }
}

function parseArgs(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--html-file') {
      opts.htmlFile = argv[++i];
    } else {
      positional.push(argv[i]);
    }
  }
  return { url: positional[0], opts };
}

if (require.main === module) {
  const { url, opts } = parseArgs(process.argv.slice(2));
  if (!url) {
    console.error('Usage: node scripts/ingest-recipe.js [--html-file <path>] <url>');
    process.exit(1);
  }
  main(url, opts).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fetchPage, main, parseArgs, extractFromSchema, extractWithClaude, slugify, loadRecipes, addRecipe, saveRecipes };
