import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import { FLAIRS, applyFlair, resolveFlair } from '../core/flair';
import { homeRunLadders } from '../../shared/data/homeRunLadders';
import { homeRunKeys } from '../core/homeRunStore';
import type { HomeRunPostData } from '../../shared/types/homeRun';
import type { Config } from '../../shared/api';
import { allBallparks } from '../../shared/data/ballparks';
import { isDevSubreddit } from '../core/subreddit';

export const scheduler = new Hono();

export const triggerDailyBallparkPost = async (
  subredditName: string,
  options: { isManual?: boolean } = {}
) => {
  if (isDevSubreddit(subredditName) && !options.isManual) {
    throw new Error(`Daily ballpark posts are disabled for dev subreddit (${subredditName})`);
  }

  if (!allBallparks || allBallparks.length === 0) {
    throw new Error('No ballpark options found in configuration');
  }

  // Get current game index from Redis (cycles 0 to 299 across all 300 verified items)
  const redisKey = 'ballpark:daily-game:index';
  const currentIndexStr = await redis.get(redisKey);
  let index = currentIndexStr ? parseInt(currentIndexStr, 10) : 0;

  if (isNaN(index) || index < 0 || index >= allBallparks.length) {
    index = 0;
  }

  const game = allBallparks[index];
  if (!game) {
    throw new Error(`Ballpark option not found at index ${index}`);
  }

  // Determine title prefix
  let titlePrefix = 'how many ';
  if (game.type === 'percentage') {
    titlePrefix = 'the percentage of ';
  } else if (game.type === 'cost') {
    titlePrefix = 'the cost of ';
  }
  const formattedTitle = `Gimme a Ballpark for ${titlePrefix}${game.text}`;

  const { flairId, flairText } = await resolveFlair(subredditName, FLAIRS.ballpark);

  // Construct game configuration
  const config: Config = {
    type: game.type,
    text: game.text,
    min: game.min,
    max: game.max,
    answer: game.answer,
    explanation: game.explanation,
    authorName: `Daily Ballpark #${index + 1}`,
  };

  // Submit custom post
  const post = await createPost(
    formattedTitle,
    subredditName,
    false,
    flairId,
    flairText,
    config as Parameters<typeof createPost>[5]
  );

  const cleanId = post.id.replace('t3_', '');
  const idWithPrefix = `t3_${cleanId}`;

  // Store complete config in Redis
  await Promise.all([
    redis.set(`post:${post.id}:config`, JSON.stringify(config)),
    redis.set(`post:${cleanId}:config`, JSON.stringify(config)),
    redis.set(`post:${idWithPrefix}:config`, JSON.stringify(config)),
  ]);

  await applyFlair(subredditName, post.id, FLAIRS.ballpark, flairId);

  // If author/game has an explanation, post it as a top-level Reddit comment
  if (game.explanation && game.explanation.trim()) {
    try {
      await reddit.submitComment({
        id: post.id as `t3_${string}`,
        text: `💡 **Ballpark Fact / Explanation:**\n\n${game.explanation.trim()}`,
      });
    } catch (commentErr) {
      console.warn(`Failed to submit explanation comment for post ${post.id}:`, commentErr);
    }
  }

  // Increment and save the next index for tomorrow
  const nextIndex = (index + 1) % allBallparks.length;
  await redis.set(redisKey, String(nextIndex));

  return { post, game, index, nextIndex };
};

// Scheduler POST endpoint triggered by Devvit cron job ("0 9 * * *")
scheduler.post('/daily-post', async (c) => {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      console.error('Subreddit name is not available in context');
      return c.json({ status: 'error', message: 'Subreddit name is required' }, 400);
    }

    if (isDevSubreddit(subredditName)) {
      console.log(`Skipping scheduled daily ballpark post for dev subreddit: ${subredditName}`);
      return c.json({
        status: 'skipped',
        message: `Daily ballpark posts are disabled on dev subreddit: ${subredditName}`,
      }, 200);
    }

    const { game, index, nextIndex, post } = await triggerDailyBallparkPost(subredditName);

    return c.json({
      status: 'success',
      message: `Daily Ballpark #${index + 1} ('${game.text}') posted successfully to ${subredditName}. Post ID: ${post.id}. Next index: ${nextIndex}`,
    }, 200);
  } catch (error) {
    console.error('Error running daily post scheduler:', error);
    return c.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export const triggerDailyHomeRunPost = async (
  subredditName: string,
  options: { isManual?: boolean } = {}
) => {
  if (isDevSubreddit(subredditName) && !options.isManual) {
    throw new Error(`Daily home run posts are disabled for dev subreddit (${subredditName})`);
  }

  if (homeRunLadders.length === 0) {
    throw new Error('No Home Run ladders found in configuration');
  }

  const [indexStr, countStr] = await Promise.all([
    redis.get(homeRunKeys.dailyIndex),
    redis.get(homeRunKeys.dailyCount),
  ]);
  const parsedIndex = indexStr ? parseInt(indexStr, 10) : 0;
  const index = Number.isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex >= homeRunLadders.length ? 0 : parsedIndex;
  const puzzleNumber = (countStr ? parseInt(countStr, 10) || 0 : 0) + 1;

  const ladder = homeRunLadders[index];
  if (!ladder) {
    throw new Error(`Home Run ladder not found at index ${index}`);
  }

  const { flairId, flairText } = await resolveFlair(subredditName, FLAIRS.homeRun);

  const postData: HomeRunPostData = { mode: 'homerun', ladderId: ladder.id, puzzleNumber };
  const post = await createPost(
    `⚾ Home Run #${puzzleNumber}: ${ladder.title}`,
    subredditName,
    false,
    flairId,
    flairText,
    postData
  );

  await redis.set(homeRunKeys.ladder(post.id), ladder.id);
  await applyFlair(subredditName, post.id, FLAIRS.homeRun, flairId);

  await Promise.all([
    redis.set(homeRunKeys.dailyIndex, String((index + 1) % homeRunLadders.length)),
    redis.set(homeRunKeys.dailyCount, String(puzzleNumber)),
  ]);

  return { post, ladder, puzzleNumber };
};

scheduler.post('/daily-homerun-post', async (c) => {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      return c.json({ status: 'error', message: 'Subreddit name is required' }, 400);
    }

    if (isDevSubreddit(subredditName)) {
      console.log(`Skipping scheduled daily home run post for dev subreddit: ${subredditName}`);
      return c.json(
        { status: 'skipped', message: `Daily home run posts are disabled on dev subreddit: ${subredditName}` },
        200
      );
    }

    const { ladder, puzzleNumber, post } = await triggerDailyHomeRunPost(subredditName);
    return c.json(
      { status: 'success', message: `Home Run #${puzzleNumber} ('${ladder.title}') posted. Post ID: ${post.id}` },
      200
    );
  } catch (error) {
    console.error('Error running daily home run scheduler:', error);
    return c.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
