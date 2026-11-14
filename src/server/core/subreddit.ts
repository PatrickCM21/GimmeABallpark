import { context } from '@devvit/web/server';

/**
 * Checks whether the given subreddit name (or current context subreddit) represents
 * a development/test server (e.g. `gimmeaballpark_dev`, `gimmeaballparkdev`, `*_dev`, `*-dev`).
 */
export const isDevSubreddit = (name?: string): boolean => {
  let sub = name;
  if (!sub) {
    try {
      sub = context.subredditName;
    } catch {
      sub = undefined;
    }
  }
  const raw = (sub ?? '').trim().toLowerCase();
  if (!raw) return false;
  const subName = raw.replace(/^\/?r\//, '');
  return (
    subName.includes('gimmeaballpark_dev') ||
    subName.includes('gimmeaballparkdev') ||
    subName.includes('ballpark_dev') ||
    subName.includes('ballparkdev') ||
    subName.endsWith('_dev') ||
    subName.endsWith('-dev')
  );
};
