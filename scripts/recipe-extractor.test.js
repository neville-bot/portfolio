const { extract, isAcceptable } = require('./recipe-extractor');

function makeExtractors(...impls) {
  return impls.map((impl, i) => ({
    name: impl.name || `extractor-${i}`,
    run: jest.fn(impl.run),
  }));
}

describe('isAcceptable', () => {
  it('rejects null/undefined', () => {
    expect(isAcceptable(null)).toBe(false);
    expect(isAcceptable(undefined)).toBe(false);
  });

  it('rejects missing or empty title', () => {
    expect(isAcceptable({})).toBe(false);
    expect(isAcceptable({ title: '' })).toBe(false);
    expect(isAcceptable({ title: '   ' })).toBe(false);
  });

  it('accepts non-empty title', () => {
    expect(isAcceptable({ title: 'Pasta' })).toBe(true);
  });
});

describe('extract', () => {
  it('returns schema source when first extractor succeeds; never calls later ones', async () => {
    const extractors = makeExtractors(
      { name: 'schema', run: async () => ({ title: 'Pasta', ingredients: ['x'], steps: ['y'] }) },
      { name: 'claude', run: async () => ({ title: 'Should not run' }) },
    );
    const result = await extract('<html/>', { extractors });
    expect(result.source).toBe('schema');
    expect(result.recipe.title).toBe('Pasta');
    expect(extractors[1].run).not.toHaveBeenCalled();
  });

  it('falls through to next extractor when prior returns null', async () => {
    const extractors = makeExtractors(
      { name: 'schema', run: async () => null },
      { name: 'claude', run: async () => ({ title: 'Lemon Tart' }) },
    );
    const result = await extract('<html/>', { extractors });
    expect(result.source).toBe('claude');
    expect(result.recipe.title).toBe('Lemon Tart');
  });

  it('falls through when prior returns extraction with empty title', async () => {
    const extractors = makeExtractors(
      { name: 'schema', run: async () => ({ title: '', ingredients: ['x'] }) },
      { name: 'claude', run: async () => ({ title: 'Soup' }) },
    );
    const result = await extract('<html/>', { extractors });
    expect(result.source).toBe('claude');
  });

  it('returns { recipe: null, source: null } when all extractors unacceptable', async () => {
    const extractors = makeExtractors(
      { name: 'schema', run: async () => null },
      { name: 'claude', run: async () => ({ title: '   ' }) },
    );
    const result = await extract('<html/>', { extractors });
    expect(result).toEqual({ recipe: null, source: null });
  });

  it('propagates exceptions from extractors', async () => {
    const extractors = makeExtractors(
      { name: 'schema', run: async () => { throw new Error('boom'); } },
    );
    await expect(extract('<html/>', { extractors })).rejects.toThrow('boom');
  });
});
