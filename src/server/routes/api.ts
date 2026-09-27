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
  const { postId } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const isHubStr = await redis.get(`post:${postId}:isHub`);
  const isHub = isHubStr === 'true';

  const configStr = await redis.get(`post:${postId}:config`);
  const configured = !!configStr;
  
  let config: Config | undefined;
  if (configured) {
    config = JSON.parse(configStr) as Config;
  }

  const username = await reddit.getCurrentUsername();
  let userGuess: number | undefined;
  if (username) {
    const guessStr = await redis.get(`post:${postId}:user:${username}`);
    if (guessStr) {
      userGuess = parseFloat(guessStr);
    }
  }

  let stats;
  if (configured) {
    const totalGuessesStr = await redis.get(`post:${postId}:stats:total`);
    const sumGuessesStr = await redis.get(`post:${postId}:stats:sum`);
    const totalGuesses = totalGuessesStr ? parseInt(totalGuessesStr, 10) : 0;
    const sumGuesses = sumGuessesStr ? parseFloat(sumGuessesStr) : 0;
    
    const samples = await redis.lRange(`post:${postId}:samples`, 0, 19);
    const parsedSamples = samples.map(s => parseFloat(s)).filter(n => !isNaN(n));

    stats = {
      totalGuesses,
      averageGuess: totalGuesses > 0 ? sumGuesses / totalGuesses : 0,
      samples: parsedSamples
    };
  }

  return c.json<GameDataResponse>({
    isHub,
    configured,
    config,
    userGuess,
    stats
  });
});

api.post('/create-game', async (c) => {
  const { postId, subredditName } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  // Validate the request came from a Hub post
  const isHubStr = await redis.get(`post:${postId}:isHub`);
  if (isHubStr !== 'true') return c.json({ error: 'only Hub posts can create games' }, 400);

  const config = await c.req.json<CreateGameRequest>();
  
  try {
    const newPost = await reddit.submitCustomPost({
      title: `Gimme a Ballpark: ${config.type === 'percentage' ? 'Percentage of' : 'Cost of'} ${config.text}`,
      subredditName: subredditName!,
    });

    await redis.set(`post:${newPost.id}:config`, JSON.stringify(config));

    return c.json<CreateGameResponse>({ success: true, postId: newPost.id });
  } catch (error: unknown) {
    console.error("Failed to create game post", error);
    return c.json<CreateGameResponse>({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

api.post('/guess', async (c) => {
  const { postId } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const { guess } = await c.req.json<GuessRequest>();
  const username = await reddit.getCurrentUsername();
  
  if (!username) return c.json({ error: 'unauthorized' }, 403);

  const userKey = `post:${postId}:user:${username}`;
  const existingGuess = await redis.get(userKey);
  if (existingGuess) {
    return c.json({ error: 'already guessed' }, 400);
  }

  const configStr = await redis.get(`post:${postId}:config`);
  if (!configStr) return c.json({ error: 'not configured' }, 400);
  const config = JSON.parse(configStr) as Config;

  await redis.set(userKey, guess.toString());

  const total = await redis.incrBy(`post:${postId}:stats:total`, 1);
  let sum = 0;
  try {
    sum = await redis.incrBy(`post:${postId}:stats:sum`, guess); 
  } catch(e) {
    console.warn("Failed to increment sum", e);
  }

  await redis.lPush(`post:${postId}:samples`, [guess.toString()]);
  await redis.lTrim(`post:${postId}:samples`, 0, 99); 

  const averageGuess = total > 0 ? sum / total : 0;
  
  const userError = Math.abs(guess - config.answer);
  const averageError = Math.abs(averageGuess - config.answer);
  const closerThanMajority = userError < averageError;

  const samples = await redis.lRange(`post:${postId}:samples`, 0, 19);
  const parsedSamples = samples.map(s => parseFloat(s)).filter(n => !isNaN(n));

  return c.json<GuessResponse>({
    success: true,
    stats: {
      totalGuesses: total,
      averageGuess,
      samples: parsedSamples
    },
    closerThanMajority
  });
});
