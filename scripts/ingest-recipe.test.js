const { extractFromSchema } = require('./ingest-recipe');

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
    expect(result.steps[2]).toBe('Mix eggs with pasta off heat.');
  });

  it('finds Recipe nested inside @graph', () => {
    const result = extractFromSchema(GRAPH_HTML);
    expect(result.title).toBe('Simple Soup');
    expect(result.ingredients).toEqual(['1 onion']);
  });
});
