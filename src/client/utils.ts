export const getTitlePrefix = (t: 'percentage' | 'cost' | 'count') => {
  if (t === 'percentage') return 'the percentage of ';
  if (t === 'cost') return 'the cost of ';
  return 'how many ';
};

export const getPlaceholder = (t: 'percentage' | 'cost' | 'count') => {
  switch (t) {
    case 'percentage':
      return 'people who prefer dogs over cats';
    case 'cost':
      return 'a 1990 Honda Civic';
    case 'count':
      return 'stairs in the Eiffel Tower';
  }
};

export const formatValue = (val: number, t: 'percentage' | 'cost' | 'count') => {
  if (t === 'percentage') return `${val}%`;
  if (t === 'cost') return `$${val.toLocaleString()}`;
  return val.toLocaleString();
};

// Maps 0-100% position onto the exact range input track bounds (accounting for 32px thumb radius)
export const toTrackPct = (pct: number) => {
  const clamped = Math.max(0, Math.min(100, isNaN(pct) ? 50 : pct));
  const offset = 16 - (clamped / 100) * 32;
  return `calc(${clamped}% + ${offset.toFixed(2)}px)`;
};
