import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis, reddit } from '@devvit/web/server';

export const menu = new Hono();

menu.post('/hub-create', async (c) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'Gimme a Ballpark Hub',
      subredditName: context.subredditName,
    });
    
    // Mark this post as a Hub
    await redis.set(`post:${post.id}:isHub`, 'true');

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
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
