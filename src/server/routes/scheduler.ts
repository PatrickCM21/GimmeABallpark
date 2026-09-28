import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import type { Config } from '../../shared/api';
import { allBallparks } from '../../shared/data/ballparks';

export const scheduler = new Hono();

export const triggerDailyBallparkPost = async (subredditName: string) => {
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

  // Search or create the "Daily" flair template first
  let flairId: string | undefined;
  let flairText: string | undefined = 'Daily';

  try {
    const templates = await reddit.getPostFlairTemplates(subredditName);
    let dailyTemplate = templates.find((t) => t.text.toLowerCase() === 'daily');

    if (!dailyTemplate) {
      console.log(`'Daily' flair template not found on ${subredditName}. Attempting to create it...`);
      try {
        dailyTemplate = await reddit.createPostFlairTemplate({
          subredditName,
          text: 'Daily',
          modOnly: true,
          backgroundColor: '#EAB308', // Ballpark Yellow
          textColor: 'dark',
        });
        console.log(`Created 'Daily' flair template with ID ${dailyTemplate.id}`);
      } catch (createErr) {
        console.error('Failed to create flair template (likely missing moderator permissions):', createErr);
      }
    }

    if (dailyTemplate) {
      flairId = dailyTemplate.id;
      flairText = undefined;
    }
  } catch (flairErr) {
    console.error(`Failed to fetch/create flair template for ${subredditName}:`, flairErr);
  }

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

  // Double-check fallback: apply flair if not attached during submission
  try {
    if (flairId) {
      await reddit.setPostFlair({
        subredditName,
        postId: post.id,
        flairTemplateId: flairId,
      });
    } else {
      await reddit.setPostFlair({
        subredditName,
        postId: post.id,
        text: 'Daily',
      });
    }
  } catch (flairFallbackErr) {
    console.warn(`Fallback flair application failed for post ${post.id}:`, flairFallbackErr);
  }

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
