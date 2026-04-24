const cheerio = require('cheerio');
const slugifyLib = require('slugify');
const fs = require('fs');
const path = require('path');
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

module.exports = { extractFromSchema, extractWithClaude, slugify, loadRecipes, addRecipe, saveRecipes };
