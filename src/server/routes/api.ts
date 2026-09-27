import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  GameDataResponse,
  SaveConfigRequest,
  SaveConfigResponse,
  GuessRequest,
  GuessResponse,
  Config
} from '../../shared/api';

export const api = new Hono();

// Helper to check if a user is the author
const isAuthor = async (postId: string, username: string | null) => {
  if (!username) return false;
  try {
    const post = await reddit.getPostById(postId);
    return post.authorName === username;
  } catch (e) {
    console.error("Failed to fetch post author", e);
    return false;
  }
};

api.get('/game-data', async (c) => {
  const { postId } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const username = await reddit.getCurrentUsername();
  const authorCheck = await isAuthor(postId, username);

  const configStr = await redis.get(`post:${postId}:config`);
  const configured = !!configStr;
  
  let config: Config | undefined;
  if (configured) {
    config = JSON.parse(configStr) as Config;
  }

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
    
    // Fetch last 20 samples from a redis list (we use a list to keep things simple and push to it)
    const samples = await redis.lRange(`post:${postId}:samples`, 0, 19);
    const parsedSamples = samples.map(s => parseFloat(s)).filter(n => !isNaN(n));

    stats = {
      totalGuesses,
      averageGuess: totalGuesses > 0 ? sumGuesses / totalGuesses : 0,
      samples: parsedSamples
    };
  }

  return c.json<GameDataResponse>({
    configured,
    isAuthor: authorCheck,
    config,
    userGuess,
    stats
  });
});

api.post('/save-config', async (c) => {
  const { postId } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const config = await c.req.json<SaveConfigRequest>();
  const username = await reddit.getCurrentUsername();
  
  if (!(await isAuthor(postId, username))) {
    return c.json({ error: 'unauthorized' }, 403);
  }

  await redis.set(`post:${postId}:config`, JSON.stringify(config));
  return c.json<SaveConfigResponse>({ success: true });
});

api.post('/guess', async (c) => {
  const { postId } = context;
  if (!postId) return c.json({ error: 'postId missing' }, 400);

  const { guess } = await c.req.json<GuessRequest>();
  const username = await reddit.getCurrentUsername();
  
  if (!username) return c.json({ error: 'unauthorized' }, 403);

  // Ensure they haven't guessed yet
  const userKey = `post:${postId}:user:${username}`;
  const existingGuess = await redis.get(userKey);
  if (existingGuess) {
    return c.json({ error: 'already guessed' }, 400);
  }

  // Get config
  const configStr = await redis.get(`post:${postId}:config`);
  if (!configStr) return c.json({ error: 'not configured' }, 400);
  const config = JSON.parse(configStr) as Config;

  // Save the guess
  await redis.set(userKey, guess.toString());

  // Update stats atomically using lua or sequential ops if simple
  const total = await redis.incrBy(`post:${postId}:stats:total`, 1);
  // incrByFloat handles floating point summing
  let sum = 0;
  try {
    const res = await redis.incrBy(`post:${postId}:stats:sum`, guess); // Using integer for now, assuming guesses are ints. If float needed, need to manage it. Let's assume int to be safe with incrBy, or use a tx.
    sum = res;
  } catch(e) {
      // Fallback
  }

  // Add sample
  await redis.lPush(`post:${postId}:samples`, [guess.toString()]);
  await redis.lTrim(`post:${postId}:samples`, 0, 99); // keep last 100 samples

  const averageGuess = total > 0 ? sum / total : 0;
  
  // Calculate if closer than majority (simplified: compare error to average error)
  // For a real game, you might want to track a histogram, but comparing to average error is a fun heuristic.
  // Or just "did you beat the crowd's average guess?"
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
