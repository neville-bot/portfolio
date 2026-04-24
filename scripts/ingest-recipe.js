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

module.exports = { extractFromSchema };
