# Gimme a Ballpark

## App Overview
**Gimme a Ballpark** is an interactive, multiplayer guessing game built for Reddit using Devvit. Designed for communities that love trivia and challenging their intuition, the app presents players with a prompt (e.g., "the cost of a 1990s vintage car", "how many jelly beans fit in a jar") and asks them to guess the exact number.

Once a player submits their guess, the game reveals the correct answer, displays a fun fact or backstory about the answer, and compares the user's guess against the community average. 

The app features two main modes of play:
1. **Daily Ballpark**: A scheduled daily post where the entire subreddit can participate in guessing a specific number.
2. **Community-Created Games**: Moderators can create a "Game Hub" where any user can author their own custom "Gimme a Ballpark" games. Users can upload an image, write a prompt, set the exact answer, and provide a fun fact. Once published, these custom games become standalone posts for others to interact with.

### Critical Operational Notes
- The app requires installation on a subreddit to function.
- It utilizes the Devvit Serverless environment (`Hono`, `tRPC`, `Redis`) to store game configurations, user guesses, and calculate aggregate statistics.
- The app requires the `SUBMIT_POST` and `SUBMIT_COMMENT` permissions to create new game posts and add explanation comments to those posts.
- A daily scheduled job runs automatically (default: 9:00 AM UTC) to post the daily ballpark.

---

## Instructions

### Configuration
1. **Scheduler**: The daily automated post is configured in `devvit.json` under the `scheduler` block. By default, it runs at `0 9 * * *` (9:00 AM daily). You can modify the cron expression to change the frequency.
2. **Permissions**: Ensure the app has the necessary Reddit API permissions (`SUBMIT_POST`, `SUBMIT_COMMENT`) in `devvit.json`.

### Deployment
To deploy this app to a subreddit:
1. Install the Devvit CLI: `npm install -g devvit`
2. Log in to your Reddit account: `devvit login`
3. Upload your app: `npx devvit upload`
4. Publish the app: `npx devvit publish` (Version 1.0.0 or later is recommended).
5. Install the app on your chosen subreddit through the Devvit developer portal or CLI.

### Interacting with the App's Full Feature Set
- **Trigger Daily Ballpark (Moderator Action)**: Subreddit moderators can manually trigger a new daily game by clicking the three-dot menu `(...)` on the subreddit page and selecting `Trigger Daily Ballpark`.
- **Create Game Hub (Moderator Action)**: Moderators can also create a hub by clicking `Create Game Hub` in the subreddit menu. This posts a specialized Game Hub to the subreddit.
- **Create a Custom Game (User Action)**: Any user can open the Game Hub post, tap the "Create" button, and follow the interactive UI to build a new ballpark game card. They will need to provide a target answer, an image (which can be cropped in the app), and a fun fact.
- **Playing the Game**: When encountering a Gimme a Ballpark post in the Reddit feed, users can simply type their numerical guess into the input field and submit. The app will immediately display the true answer, their accuracy, the community's average guess, and the creator's explanation fact.
