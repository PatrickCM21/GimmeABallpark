import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis, reddit } from '@devvit/web/server';
import { triggerDailyBallparkPost } from './scheduler';

export const menu = new Hono();

menu.post('/hub-create', async (c) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'Gimme a Ballpark Hub',
      subredditName: context.subredditName,
    });
    
    const cleanId = post.id.replace('t3_', '');
    const idWithPrefix = `t3_${cleanId}`;

    const targetUrl = post.url || (post.permalink ? `https://reddit.com${post.permalink}` : `https://reddit.com/r/${context.subredditName}/comments/${cleanId}`);

    // Mark post as a Hub across all possible key representations
    await Promise.all([
      redis.set(`post:${post.id}:isHub`, 'true'),
      redis.set(`post:${cleanId}:isHub`, 'true'),
      redis.set(`post:${idWithPrefix}:isHub`, 'true'),
      redis.set('hub:latest:url', targetUrl),
    ]);

    return c.json<UiResponse>(
      {
        navigateTo: targetUrl,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating hub post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create hub post',
      },
      400
    );
  }
});

menu.post('/trigger-daily', async (c) => {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      return c.json<UiResponse>(
        {
          showToast: 'Subreddit name missing in context',
        },
        400
      );
    }

    const { post, index } = await triggerDailyBallparkPost(subredditName);
    const cleanId = post.id.replace('t3_', '');
    const targetUrl = post.url || (post.permalink ? `https://reddit.com${post.permalink}` : `https://reddit.com/r/${subredditName}/comments/${cleanId}`);

    return c.json<UiResponse>(
      {
        showToast: `✅ Daily Ballpark #${index + 1} posted successfully!`,
        navigateTo: targetUrl,
      },
      200
    );
  } catch (error) {
    console.error(`Error triggering daily ballpark post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: `Failed to trigger daily post: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      400
    );
  }
});
