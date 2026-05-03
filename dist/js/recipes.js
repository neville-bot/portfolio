function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseQuantity(line) {
  if (typeof line !== 'string') return { qty: null, name: '' };
  const trimmed = line.trim();
  if (!trimmed) return { qty: null, name: '' };

  const units = [
    'Tablespoons', 'Tablespoon', 'Tbsp',
    'teaspoons', 'teaspoon', 'tsp',
    'cups', 'cup',
    'ounces', 'ounce', 'oz',
    'pounds', 'pound', 'lbs', 'lb',
    'grams', 'gram', 'g',
    'kilograms', 'kilogram', 'kg',
    'milliliters', 'milliliter', 'ml',
    'liters', 'liter', 'l',
    'cloves', 'clove',
    'pinches', 'pinch',
    'dashes', 'dash',
    'sprigs', 'sprig',
    'cans', 'can',
    'packages', 'package', 'pkg',
    'sticks', 'stick',
    'slices', 'slice',
  ];

  const numberPart = '[\\d¼½¾⅓⅔⅛⅜⅝⅞]+(?:\\s*[/-]\\s*[\\d¼½¾⅓⅔⅛⅜⅝⅞]+)?';
  const unitPart = `(?:\\s+(?:${units.join('|')}))?`;
  const re = new RegExp(`^(${numberPart}${unitPart})(?:\\s+(.*))?$`);

  const match = trimmed.match(re);
  if (!match) return { qty: null, name: trimmed };

  const qty = match[1].trim();
  const name = (match[2] || '').trim();
  return { qty, name };
}

function renderRecipe(recipe) {
  return `
            <h2 class="recipe-title">${escHtml(recipe.title)}</h2>
            <div class="recipe-body">
              <div class="recipe-ingredients">
                <h3>Ingredients</h3>
                <ul>${recipe.ingredients.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>
              </div>
              <div class="recipe-steps">
                <h3>Steps</h3>
                <ol>${recipe.steps.map(s => `<li>${escHtml(s)}</li>`).join('')}</ol>
              </div>
            </div>
          `;
}

function init({ select, display, fetchJson }) {
  let recipes = [];

  const showEmpty = () => { display.innerHTML = '<p>No recipes yet.</p>'; };

  fetchJson('./data/recipes.json').then(data => {
    if (!Array.isArray(data) || !data.length) { showEmpty(); return; }
    recipes = data;
    recipes.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title;
      select.appendChild(opt);
    });
  }).catch(showEmpty);

  select.addEventListener('change', () => {
    const recipe = recipes.find(r => r.id === select.value);
    if (!recipe) { display.innerHTML = ''; return; }
    display.innerHTML = renderRecipe(recipe);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { escHtml, parseQuantity, renderRecipe, init };
}
