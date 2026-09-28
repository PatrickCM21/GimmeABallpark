import { reddit, context } from '@devvit/web/server';

type SubmitCustomPostOptions = Parameters<typeof reddit.submitCustomPost>[0];

export const createPost = async (
  title: string = 'Gimme a Ballpark!',
  subredditName?: string,
  isUgc: boolean = false,
  flairId?: string,
  flairText?: string,
  postData?: SubmitCustomPostOptions['postData']
) => {
  const postOptions: SubmitCustomPostOptions = {
    title,
    subredditName: subredditName ?? context.subredditName,
    flairId,
    flairText,
    postData,
    ...(isUgc
      ? {
          runAs: 'USER' as const,
          userGeneratedContent: { text: title },
        }
      : {
          runAs: 'APP' as const,
        }),
  };

  return await reddit.submitCustomPost(postOptions);
};
