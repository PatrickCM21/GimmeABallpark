/**
 * Curated collection of verified, official Reddit Snoovatar avatar images from Reddit's CDN.
 * Combines all 20 unique Reddit Snoo archetype poses/styles across varied colorways,
 * plus modern v2 Snoovatar avatars.
 */
export const OFFICIAL_SNOOVATAR_URLS: readonly string[] = [
  // Modern Reddit v2 Snoovatars (expressions, outfits, styles)
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_0.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_2.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_3.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_4.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_5.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png',
  'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_7.png',

  // 20 Official Reddit Snoo styles (holding items, hats, expressions, sunglasses, headphones, etc.)
  'https://www.redditstatic.com/avatars/avatar_default_01_FF4500.png',
  'https://www.redditstatic.com/avatars/avatar_default_02_0079D3.png',
  'https://www.redditstatic.com/avatars/avatar_default_03_24A0ED.png',
  'https://www.redditstatic.com/avatars/avatar_default_04_FFB000.png',
  'https://www.redditstatic.com/avatars/avatar_default_05_FFD635.png',
  'https://www.redditstatic.com/avatars/avatar_default_06_DDBD37.png',
  'https://www.redditstatic.com/avatars/avatar_default_07_FF4500.png',
  'https://www.redditstatic.com/avatars/avatar_default_08_A5A4A4.png',
  'https://www.redditstatic.com/avatars/avatar_default_09_545452.png',
  'https://www.redditstatic.com/avatars/avatar_default_10_FF4500.png',
  'https://www.redditstatic.com/avatars/avatar_default_11_46D160.png',
  'https://www.redditstatic.com/avatars/avatar_default_12_25B79F.png',
  'https://www.redditstatic.com/avatars/avatar_default_13_FF4500.png',
  'https://www.redditstatic.com/avatars/avatar_default_14_C18D42.png',
  'https://www.redditstatic.com/avatars/avatar_default_15_FF5700.png',
  'https://www.redditstatic.com/avatars/avatar_default_16_DB0064.png',
  'https://www.redditstatic.com/avatars/avatar_default_17_7193FF.png',
  'https://www.redditstatic.com/avatars/avatar_default_18_FF8717.png',
  'https://www.redditstatic.com/avatars/avatar_default_19_EA0027.png',
  'https://www.redditstatic.com/avatars/avatar_default_20_94E044.png',
] as const;

/** Fallback local asset (Default naked Reddit Snoo from the trolley problem game) */
export const DEFAULT_LOCAL_SNOO = '/default_snoo.png';
