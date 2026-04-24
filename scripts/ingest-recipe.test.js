jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          text: '{"title":"Lemon Tart","ingredients":["3 eggs","100g sugar","juice of 2 lemons"],"steps":["Mix eggs and sugar.","Add lemon juice.","Bake at 180C for 20 min."]}',
        }],
      }),
    },
  }));
});

const { extractFromSchema, extractWithClaude } = require('./ingest-recipe');

const SCHEMA_HTML = `<html><head>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Recipe","name":"Pasta Carbonara",
   "recipeIngredient":["200g spaghetti","3 eggs","100g pancetta"],
   "recipeInstructions":[
     {"@type":"HowToStep","text":"Boil pasta until al dente."},
     {"@type":"HowToStep","text":"Fry pancetta until crispy."},
     "Mix eggs with pasta off heat."
   ]}
  </script>
</head><body></body></html>`;

const NO_SCHEMA_HTML = `<html><body><h1>Recipe</h1><p>Mix stuff.</p></body></html>`;

const GRAPH_HTML = `<html><head>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@graph":[
    {"@type":"WebPage","name":"Test"},
    {"@type":"Recipe","name":"Simple Soup",
     "recipeIngredient":["1 onion"],
     "recipeInstructions":["Chop onion.","Boil water."]}
  ]}
  </script>
</head><body></body></html>`;

describe('extractFromSchema', () => {
  it('returns null when no schema.org Recipe is present', () => {
    expect(extractFromSchema(NO_SCHEMA_HTML)).toBeNull();
  });

  it('extracts title, ingredients, and steps from Recipe schema', () => {
    const result = extractFromSchema(SCHEMA_HTML);
    expect(result.title).toBe('Pasta Carbonara');
    expect(result.ingredients).toEqual(['200g spaghetti', '3 eggs', '100g pancetta']);
    expect(result.steps).toEqual([
      'Boil pasta until al dente.',
      'Fry pancetta until crispy.',
      'Mix eggs with pasta off heat.',
    ]);
  });

  it('normalises HowToStep objects and plain strings', () => {
    const result = extractFromSchema(SCHEMA_HTML);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]).toBe('Boil pasta until al dente.');
    expect(result.steps[1]).toBe('Fry pancetta until crispy.');
    expect(result.steps[2]).toBe('Mix eggs with pasta off heat.');
  });

  it('finds Recipe nested inside @graph', () => {
    const result = extractFromSchema(GRAPH_HTML);
    expect(result.title).toBe('Simple Soup');
    expect(result.ingredients).toEqual(['1 onion']);
  });
});

const PLAIN_HTML = `<html><body>
  <nav>Nav stuff</nav>
  <h1>Lemon Tart</h1>
  <p>Ingredients: eggs, sugar, lemon.</p>
  <p>Mix and bake.</p>
</body></html>`;

describe('extractWithClaude', () => {
  it('strips nav/header/footer before sending to Claude', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    jest.clearAllMocks();
    await extractWithClaude(PLAIN_HTML);
    // The mock constructor creates instances with mock messages.create
    const instance = Anthropic.mock.results[0].value;
    const callArg = instance.messages.create.mock.calls[0][0];
    expect(callArg.messages[0].content).not.toContain('Nav stuff');
  });

  it('returns structured recipe from Claude response', async () => {
    const result = await extractWithClaude(PLAIN_HTML);
    expect(result.title).toBe('Lemon Tart');
    expect(result.ingredients).toHaveLength(3);
    expect(result.steps).toHaveLength(3);
  });

  it('returns null when Claude returns invalid JSON', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockClear();
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: 'Sorry, I could not find a recipe on this page.' }],
        }),
      },
    }));
    const result = await extractWithClaude(PLAIN_HTML);
    expect(result).toBeNull();
  });

  it('returns null when Claude response fails validation', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockClear();
    Anthropic.mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: '{"title":"Bad","ingredients":"not-an-array","steps":null}' }],
        }),
      },
    }));
    const result = await extractWithClaude(PLAIN_HTML);
    expect(result).toBeNull();
  });
});
