import { reddit } from '@devvit/web/server';

export type FlairSpec = {
  text: string;
  backgroundColor: string;
  textColor: 'light' | 'dark';
};

/** One flair per game mode. */
export const FLAIRS = {
  ballpark: { text: 'Daily Ballpark', backgroundColor: '#EAB308', textColor: 'dark' },
  homeRun: { text: 'Daily Home Run', backgroundColor: '#EF4444', textColor: 'light' },
} as const satisfies Record<string, FlairSpec>;

export type ResolvedFlair = {
  flairId?: string | undefined;
  flairText?: string | undefined;
};

/** Finds the flair template for `spec` (creating it if possible). Falls back to plain flair text. */
export const resolveFlair = async (subredditName: string, spec: FlairSpec): Promise<ResolvedFlair> => {
  try {
    const templates = await reddit.getPostFlairTemplates(subredditName);
    let template = templates.find((t) => t.text.toLowerCase() === spec.text.toLowerCase());

    if (!template) {
      try {
        template = await reddit.createPostFlairTemplate({
          subredditName,
          text: spec.text,
          modOnly: true,
          backgroundColor: spec.backgroundColor,
          textColor: spec.textColor,
        });
      } catch (createErr) {
        console.error(`Failed to create '${spec.text}' flair (likely missing moderator permissions):`, createErr);
      }
    }

    if (template) return { flairId: template.id };
  } catch (flairErr) {
    console.error(`Failed to fetch/create flair template for ${subredditName}:`, flairErr);
  }
  return { flairText: spec.text };
};

/** Double-check fallback: make sure the flair is attached even if submission didn't apply it. */
export const applyFlair = async (
  subredditName: string,
  postId: `t3_${string}`,
  spec: FlairSpec,
  flairId?: string
): Promise<void> => {
  try {
    if (flairId) {
      await reddit.setPostFlair({ subredditName, postId, flairTemplateId: flairId });
    } else {
      await reddit.setPostFlair({ subredditName, postId, text: spec.text });
    }
  } catch (err) {
    console.warn(`Fallback flair application failed for post ${postId}:`, err);
  }
};
