const path = require('path');
const { loadRecipes, saveRecipes } = require('./ingest-recipe');
const { normalize } = require('./recipe');

const recipesPath = path.join(__dirname, '../dist/data/recipes.json');
const before = loadRecipes(recipesPath);
const after = before.map(r => normalize(r, { id: r.id })).filter(Boolean);
saveRecipes(recipesPath, after);

console.log(`Migrated ${before.length} -> ${after.length} recipes.`);
