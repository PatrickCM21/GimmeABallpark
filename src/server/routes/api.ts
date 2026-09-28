import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  GameDataResponse,
  CreateGameRequest,
  CreateGameResponse,
  GuessRequest,
  GuessResponse,
  Config
} from '../../shared/api';

export const api = new Hono();

api.get('/game-data', async (c) => {
  try {
    const { postId } = context;
    if (!postId) {
      console.warn("api/game-data: context.postId is undefined");
      return c.json({ error: 'postId missing' }, 400);
    }

    const cleanId = postId.replace('t3_', '');
    const idWithPrefix = `t3_${cleanId}`;

    // 1. Check if this is a Hub post
    const [isHub1, isHub2, isHub3] = await Promise.all([
      redis.get(`post:${postId}:isHub`),
      redis.get(`post:${cleanId}:isHub`),
      redis.get(`post:${idWithPrefix}:isHub`),
    ]);
    const isHub = isHub1 === 'true' || isHub2 === 'true' || isHub3 === 'true';

    // 2. Check for Config
    let config: Config | undefined;

    // Check context.postData first (stored directly on custom post)
    if (context.postData && typeof context.postData === 'object' && 'type' in context.postData) {
      config = context.postData as Config;
    }

    // Check Redis if not in postData
    if (!config) {
      const [configStr1, configStr2, configStr3] = await Promise.all([
        redis.get(`post:${postId}:config`),
        redis.get(`post:${cleanId}:config`),
        redis.get(`post:${idWithPrefix}:config`),
      ]);
      const configStr = configStr1 || configStr2 || configStr3;
      if (configStr) {
        try {
          config = JSON.parse(configStr) as Config;
        } catch (e) {
          console.error("Failed to parse config from redis", e);
        }
      }
    }

    const configured = !!config;

    // 3. User & Guess Lookup
    let username: string | undefined;
    try {
      username = await reddit.getCurrentUsername();
    } catch (e) {
      console.warn("Could not retrieve current username:", e);
    }

    let userGuess: number | undefined;
    if (username) {
      const [guess1, guess2] = await Promise.all([
        redis.get(`post:${idWithPrefix}:user:${username}`),
        redis.get(`post:${cleanId}:user:${username}`),
      ]);
      const guessStr = guess1 || guess2;
      if (guessStr) {
        userGuess = parseFloat(guessStr);
      }
    }

    // 4. Stats Lookup
    let stats;
    if (configured) {
      const [totalStr1, sumStr1] = await Promise.all([
        redis.get(`post:${idWithPrefix}:stats:total`),
        redis.get(`post:${idWithPrefix}:stats:sum`),
      ]);
      const [totalStr2, sumStr2] = totalStr1 ? [null, null] : await Promise.all([
        redis.get(`post:${cleanId}:stats:total`),
        redis.get(`post:${cleanId}:stats:sum`),
      ]);

      const totalGuessesStr = totalStr1 || totalStr2;
      const sumGuessesStr = sumStr1 || sumStr2;
      const totalGuesses = totalGuessesStr ? parseInt(totalGuessesStr, 10) : 0;
      const sumGuesses = sumGuessesStr ? parseFloat(sumGuessesStr) : 0;

      const samplesStr = await redis.get(`post:${idWithPrefix}:samples`) || await redis.get(`post:${cleanId}:samples`);
      let samples: number[] = [];
      if (samplesStr) {
        try {
          const parsed = JSON.parse(samplesStr);
          if (Array.isArray(parsed)) {
            samples = parsed.map((n: unknown) => Number(n)).filter((n: number) => !isNaN(n));
          }
        } catch {
          samples = [];
        }
      }

      stats = {
        totalGuesses,
        averageGuess: totalGuesses > 0 ? sumGuesses / totalGuesses : 0,
        samples
      };
    }

    const hubUrl = (await redis.get('hub:latest:url')) || `https://reddit.com/r/${context.subredditName}`;

    return c.json<GameDataResponse>({
      isHub,
      configured,
      hubUrl,
      config,
      userGuess,
      stats
    });
  } catch (error: unknown) {
    console.error("API /game-data Error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error in /game-data" }, 500);
  }
});

api.post('/create-game', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const config = await c.req.json<CreateGameRequest>();
  
  try {
    let titlePrefix = 'how many ';
    if (config.type === 'percentage') {
      titlePrefix = 'the percentage of ';
    } else if (config.type === 'cost') {
      titlePrefix = 'the cost of ';
    }
    const formattedTitle = `Gimme a Ballpark for ${titlePrefix}${config.text}`;

    let authorName = config.authorName;
    let authorAvatarUrl = config.authorAvatarUrl;
    try {
      if (!authorName) {
        authorName = await reddit.getCurrentUsername();
      }
      if (authorName && !authorAvatarUrl) {
        authorAvatarUrl = await reddit.getSnoovatarUrl(authorName);
      }
    } catch (e) {
      console.warn("Could not retrieve author avatar:", e);
    }

    const fullConfig: Config = {
      ...config,
      authorName: authorName || 'Redditor',
      authorAvatarUrl,
    };

    const newPost = await reddit.submitCustomPost({
      title: formattedTitle,
      subredditName: subredditName!,
      postData: fullConfig,
    });

    const newCleanId = newPost.id.replace('t3_', '');
    const newIdWithPrefix = `t3_${newCleanId}`;

    await Promise.all([
      redis.set(`post:${newPost.id}:config`, JSON.stringify(fullConfig)),
      redis.set(`post:${newCleanId}:config`, JSON.stringify(fullConfig)),
      redis.set(`post:${newIdWithPrefix}:config`, JSON.stringify(fullConfig)),
    ]);

    const targetUrl = newPost.url || (newPost.permalink ? `https://reddit.com${newPost.permalink}` : `https://reddit.com/r/${subredditName}/comments/${newCleanId}`);

    return c.json<CreateGameResponse>({
      success: true,
      postId: newPost.id,
      postUrl: targetUrl,
    });
  } catch (error: unknown) {
    console.error("Failed to create game post:", error);
    return c.json<CreateGameResponse>({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating post"
    });
  }
});

api.post('/guess', async (c) => {
  try {
    const { postId } = context;
    if (!postId) return c.json({ error: 'postId missing' }, 400);

    const cleanId = postId.replace('t3_', '');
    const idWithPrefix = `t3_${cleanId}`;

    const { guess } = await c.req.json<GuessRequest>();
    
    let username: string | undefined;
    try {
      username = await reddit.getCurrentUsername();
    } catch (e) {
      console.warn("Could not get username for guess:", e);
    }

    if (!username) {
      username = context.userId || 'guest_' + Math.random().toString(36).substring(2, 8);
    }

    const userKey = `post:${idWithPrefix}:user:${username}`;
    const [existingGuess1, existingGuess2] = await Promise.all([
      redis.get(userKey),
      redis.get(`post:${cleanId}:user:${username}`),
    ]);
    if (existingGuess1 || existingGuess2) {
      return c.json({ error: 'already guessed' }, 400);
    }

    // Retrieve config
    let config: Config | undefined;
    if (context.postData && typeof context.postData === 'object' && 'type' in context.postData) {
      config = context.postData as Config;
    }
    if (!config) {
      const [configStr1, configStr2] = await Promise.all([
        redis.get(`post:${idWithPrefix}:config`),
        redis.get(`post:${cleanId}:config`),
      ]);
      const configStr = configStr1 || configStr2;
      if (configStr) {
        config = JSON.parse(configStr) as Config;
      }
    }

    if (!config) return c.json({ error: 'game not configured' }, 400);

    // Save guess for user under both keys
    await Promise.all([
      redis.set(userKey, guess.toString()),
      redis.set(`post:${cleanId}:user:${username}`, guess.toString()),
    ]);

    // Atomic increment for total and sum
    const total = await redis.incrBy(`post:${idWithPrefix}:stats:total`, 1);
    await redis.incrBy(`post:${cleanId}:stats:total`, 1);

    let sum = 0;
    try {
      sum = await redis.incrBy(`post:${idWithPrefix}:stats:sum`, guess);
      await redis.incrBy(`post:${cleanId}:stats:sum`, guess);
    } catch (e) {
      console.warn("Failed to increment sum", e);
    }

    // Update samples list via JSON string
    const samplesStr = await redis.get(`post:${idWithPrefix}:samples`) || await redis.get(`post:${cleanId}:samples`);
    let samples: number[] = [];
    if (samplesStr) {
      try {
        const parsed = JSON.parse(samplesStr);
        if (Array.isArray(parsed)) {
          samples = parsed.map((n: unknown) => Number(n)).filter((n: number) => !isNaN(n));
        }
      } catch {
        samples = [];
      }
    }
    samples.unshift(guess);
    if (samples.length > 25) {
      samples = samples.slice(0, 25);
    }

    await Promise.all([
      redis.set(`post:${idWithPrefix}:samples`, JSON.stringify(samples)),
      redis.set(`post:${cleanId}:samples`, JSON.stringify(samples)),
    ]);

    const averageGuess = total > 0 ? sum / total : 0;
    const userError = Math.abs(guess - config.answer);
    const averageError = Math.abs(averageGuess - config.answer);
    const closerThanMajority = userError < averageError;

    return c.json<GuessResponse>({
      success: true,
      stats: {
        totalGuesses: total,
        averageGuess,
        samples
      },
      closerThanMajority
    });
  } catch (error: unknown) {
    console.error("API /guess Error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error in /guess" }, 500);
  }
});
