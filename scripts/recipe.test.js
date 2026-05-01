const { normalize } = require('./recipe');

describe('normalize', () => {
  const id = 'pasta';

  it('returns null for null/undefined extraction', () => {
    expect(normalize(null, { id })).toBeNull();
    expect(normalize(undefined, { id })).toBeNull();
  });

  it('returns null for missing or non-string title', () => {
    expect(normalize({}, { id })).toBeNull();
    expect(normalize({ title: 42 }, { id })).toBeNull();
  });

  it('returns null for empty or whitespace-only title', () => {
    expect(normalize({ title: '' }, { id })).toBeNull();
    expect(normalize({ title: '   ' }, { id })).toBeNull();
  });

  it('defaults missing ingredients/steps to []', () => {
    const r = normalize({ title: 'Pasta' }, { id });
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
  });

  it('defaults null ingredients/steps to []', () => {
    const r = normalize({ title: 'Pasta', ingredients: null, steps: null }, { id });
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
  });

  it('filters non-string entries', () => {
    const r = normalize({ title: 'Pasta', ingredients: ['eggs', 42, null, {}], steps: ['mix', undefined] }, { id });
    expect(r.ingredients).toEqual(['eggs']);
    expect(r.steps).toEqual(['mix']);
  });

  it('filters empty/whitespace string entries', () => {
    const r = normalize({ title: 'Pasta', ingredients: ['eggs', '', '   '], steps: [] }, { id });
    expect(r.ingredients).toEqual(['eggs']);
  });

  it('trims the title', () => {
    const r = normalize({ title: '  Pasta  ' }, { id });
    expect(r.title).toBe('Pasta');
  });

  it('attaches the supplied id verbatim', () => {
    const r = normalize({ title: 'Pasta' }, { id: 'my-custom-id' });
    expect(r.id).toBe('my-custom-id');
  });
});
