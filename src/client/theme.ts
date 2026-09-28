/**
 * Modular Theme Color Configuration for Gimme a Ballpark.
 * Easily customize colors across the entire game from here.
 */
export const THEME = {
  /** Main canvas background behind game cards */
  background: '#1399FF',
  /** Darker accent shade for background borders/shadows */
  backgroundDark: '#0A7CD5',

  /** Primary card border & solid retro shadow */
  cardBorder: '#0F2B48',
  cardShadow: '#0A7CD5',

  /** Question preamble text ("GIMME A BALLPARK FOR THE") */
  preamble: '#0284C7',

  /** High-contrast question highlight text (e.g. "PEOPLE WHO LOVE DOGS") */
  questionHighlight: '#FF2A6D',

  /** Main question text ("HOW MANY", "PERCENTAGE OF") */
  questionText: '#0F172A',

  /** Guess slider thumb & tooltip badge */
  guessThumb: '#FFD000',
  guessThumbBorder: '#0F2B48',

  /** Submit guess action button */
  submitButton: '#10B981',
  submitButtonShadow: '#059669',

  /** Create your own button */
  createButton: '#FFD000',
  createButtonShadow: '#D97706',

  /** Results commentary box */
  resultBoxBg: '#F0F9FF',
  resultBoxBorder: '#BAE6FD',
  resultBoxTitle: '#0C4A6E',

  /** Timeline markers */
  sampleMarker: '#38BDF8',
  avgMarker: '#0284C7',
  realMarker: '#059669',
} as const;
