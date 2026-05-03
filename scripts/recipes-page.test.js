/**
 * @jest-environment jsdom
 */

const { escHtml, renderRecipe, init } = require('../dist/js/recipes');

describe('escHtml', () => {
  it('escapes &, <, >, "', () => {
    expect(escHtml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
  });

  it('coerces non-string inputs', () => {
    expect(escHtml(null)).toBe('null');
    expect(escHtml(42)).toBe('42');
    expect(escHtml(undefined)).toBe('undefined');
  });
});

describe('renderRecipe — new DOM shape', () => {
  const recipe = {
    id: 'demo',
    title: 'One Pot Chicken & Rice',
    ingredients: [
      '4 - 6 Tablespoons butter (divided)',
      'salt and pepper to taste',
    ],
    steps: ['First step text.', 'Second step text.'],
  };

  function htmlOf(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  it('emits a recipe-title element with the title', () => {
    const root = htmlOf(renderRecipe(recipe));
    const title = root.querySelector('.recipe-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('One Pot Chicken & Rice');
  });

  it('emits ingredients as a UL of LI.ing-row with qty + name spans', () => {
    const root = htmlOf(renderRecipe(recipe));
    const list = root.querySelector('ul.recipe-ingredients-list');
    expect(list).not.toBeNull();
    const items = list.querySelectorAll('li.ing-row');
    expect(items.length).toBe(2);

    const first = items[0];
    expect(first.querySelector('.ing-qty').textContent).toBe('4 - 6 Tablespoons');
    expect(first.querySelector('.ing-name').textContent).toBe('butter (divided)');
    expect(first.classList.contains('ing-row--full')).toBe(false);
  });

  it('falls back to ing-row--full when qty is null', () => {
    const root = htmlOf(renderRecipe(recipe));
    const items = root.querySelectorAll('li.ing-row');
    const fallback = items[1];
    expect(fallback.classList.contains('ing-row--full')).toBe(true);
    expect(fallback.querySelector('.ing-qty')).toBeNull();
    expect(fallback.querySelector('.ing-name').textContent).toBe('salt and pepper to taste');
  });

  it('emits steps as an OL of LI.step with badge + text spans', () => {
    const root = htmlOf(renderRecipe(recipe));
    const list = root.querySelector('ol.recipe-steps-list');
    expect(list).not.toBeNull();
    const items = list.querySelectorAll('li.step');
    expect(items.length).toBe(2);

    const first = items[0];
    expect(first.querySelector('.step-n').textContent).toBe('1');
    expect(first.querySelector('.step-text').textContent).toBe('First step text.');
    expect(items[1].querySelector('.step-n').textContent).toBe('2');
  });

  it('emits an Ingredients section label and a Method section label', () => {
    const root = htmlOf(renderRecipe(recipe));
    const labels = Array.from(root.querySelectorAll('.r-section')).map(el => el.textContent);
    expect(labels).toEqual(['Ingredients', 'Method']);
  });

  it('escapes ingredient name with HTML special chars', () => {
    const evil = { ...recipe, ingredients: ['<b>oops</b>'] };
    const root = htmlOf(renderRecipe(evil));
    expect(root.innerHTML).toContain('&lt;b&gt;oops&lt;/b&gt;');
    expect(root.querySelector('b')).toBeNull();
  });

  it('escapes step text with HTML special chars', () => {
    const evil = { ...recipe, steps: ['<img onerror="x">'] };
    const root = htmlOf(renderRecipe(evil));
    expect(root.querySelector('img')).toBeNull();
    expect(root.innerHTML).toContain('&lt;img');
  });

  it('escapes title with HTML special chars', () => {
    const evil = { ...recipe, title: '<script>alert(1)</script>' };
    const root = htmlOf(renderRecipe(evil));
    expect(root.querySelector('script')).toBeNull();
    expect(root.innerHTML).toContain('&lt;script&gt;');
  });
});

const { parseQuantity } = require('../dist/js/recipes');

describe('parseQuantity', () => {
  it('extracts whole-number qty with simple unit', () => {
    expect(parseQuantity('2 cups long-grain white rice')).toEqual({
      qty: '2 cups',
      name: 'long-grain white rice',
    });
  });

  it('extracts ranged qty with Tablespoons', () => {
    expect(parseQuantity('4 - 6 Tablespoons butter (divided)')).toEqual({
      qty: '4 - 6 Tablespoons',
      name: 'butter (divided)',
    });
  });

  it('extracts ASCII fraction qty', () => {
    expect(parseQuantity('1/2 tsp salt')).toEqual({
      qty: '1/2 tsp',
      name: 'salt',
    });
  });

  it('extracts unicode fraction qty', () => {
    expect(parseQuantity('½ cup milk')).toEqual({
      qty: '½ cup',
      name: 'milk',
    });
  });

  it('captures only the leading digit when modifier is not a known unit', () => {
    expect(parseQuantity('1 heaping cup shredded carrots')).toEqual({
      qty: '1',
      name: 'heaping cup shredded carrots',
    });
  });

  it('returns null qty when no leading number is present', () => {
    expect(parseQuantity('salt and pepper to taste')).toEqual({
      qty: null,
      name: 'salt and pepper to taste',
    });
  });

  it('handles empty string', () => {
    expect(parseQuantity('')).toEqual({ qty: null, name: '' });
  });

  it('handles whitespace-only input', () => {
    expect(parseQuantity('   ')).toEqual({ qty: null, name: '' });
  });

  it('handles non-string input by coercing or returning null', () => {
    expect(parseQuantity(null)).toEqual({ qty: null, name: '' });
    expect(parseQuantity(undefined)).toEqual({ qty: null, name: '' });
  });

  it('extracts oz unit', () => {
    expect(parseQuantity('8 oz cream cheese')).toEqual({
      qty: '8 oz',
      name: 'cream cheese',
    });
  });

  it('extracts pinch as a known unit', () => {
    expect(parseQuantity('1 pinch nutmeg')).toEqual({
      qty: '1 pinch',
      name: 'nutmeg',
    });
  });

  it('does not mis-match single-letter unit prefixes (e.g. "l" inside "large")', () => {
    expect(parseQuantity('1 large onion')).toEqual({
      qty: '1',
      name: 'large onion',
    });
  });

  it('handles hyphenated ranges without spaces', () => {
    expect(parseQuantity('4-6 Tbsp butter')).toEqual({
      qty: '4-6 Tbsp',
      name: 'butter',
    });
  });

  it('mixed numbers like "1 1/2 cups" are a documented limitation — only the leading whole captures', () => {
    expect(parseQuantity('1 1/2 cups flour')).toEqual({
      qty: '1',
      name: '1/2 cups flour',
    });
  });
});

describe('init', () => {
  let select, display;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="recipe-select"><option value="">-- Choose --</option></select>
      <div id="recipe-display"></div>
    `;
    select = document.getElementById('recipe-select');
    display = document.getElementById('recipe-display');
  });

  const flush = () => new Promise(r => setTimeout(r, 0));

  it('populates select with one option per recipe plus the placeholder', async () => {
    init({
      select,
      display,
      fetchJson: () => Promise.resolve([
        { id: 'a', title: 'Alpha', ingredients: [], steps: [] },
        { id: 'b', title: 'Beta', ingredients: [], steps: [] },
      ]),
    });
    await flush();
    expect(select.options.length).toBe(3);
    expect(select.options[1].value).toBe('a');
    expect(select.options[2].textContent).toBe('Beta');
  });

  it('renders nothing when change fires with unknown id', async () => {
    init({
      select,
      display,
      fetchJson: () => Promise.resolve([{ id: 'a', title: 'A', ingredients: [], steps: [] }]),
    });
    await flush();
    select.value = 'nonexistent';
    select.dispatchEvent(new Event('change'));
    expect(display.innerHTML).toBe('');
  });

  it('shows "No recipes yet." when fetchJson resolves to []', async () => {
    init({ select, display, fetchJson: () => Promise.resolve([]) });
    await flush();
    expect(display.innerHTML).toContain('No recipes yet.');
  });

  it('shows "No recipes yet." when fetchJson rejects', async () => {
    init({ select, display, fetchJson: () => Promise.reject() });
    await flush();
    expect(display.innerHTML).toContain('No recipes yet.');
  });
});
