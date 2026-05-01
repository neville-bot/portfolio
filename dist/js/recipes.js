function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  module.exports = { escHtml, renderRecipe, init };
}
