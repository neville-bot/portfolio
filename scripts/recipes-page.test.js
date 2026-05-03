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

describe('renderRecipe', () => {
  const recipe = {
    id: 'pasta',
    title: 'Pasta',
    ingredients: ['eggs', 'flour'],
    steps: ['mix', 'cook'],
  };

  it('includes title, all ingredients (in order), all steps (in order)', () => {
    const html = renderRecipe(recipe);
    expect(html).toContain('Pasta');
    const eggsIdx = html.indexOf('eggs');
    const flourIdx = html.indexOf('flour');
    expect(eggsIdx).toBeGreaterThan(-1);
    expect(flourIdx).toBeGreaterThan(eggsIdx);
    const mixIdx = html.indexOf('mix');
    const cookIdx = html.indexOf('cook');
    expect(mixIdx).toBeGreaterThan(-1);
    expect(cookIdx).toBeGreaterThan(mixIdx);
  });

  it('escapes title containing <script>', () => {
    const html = renderRecipe({ ...recipe, title: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)');
  });

  it('escapes ingredient and step content', () => {
    const html = renderRecipe({ ...recipe, ingredients: ['<b>boom</b>'], steps: ['"go"'] });
    expect(html).toContain('&lt;b&gt;boom&lt;/b&gt;');
    expect(html).toContain('&quot;go&quot;');
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
