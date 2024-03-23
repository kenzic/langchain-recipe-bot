import quickCLIPrompt from "@kenzic/quick-cli-prompt";
import { withHistory } from "./bot.js";

/**
 * RunnableWithMessageHistory requires a session ID to track history.
 * For this example, I'm using a constant session ID.
 * In a production app, you would want to generate a unique session ID for each user.
 * failure to do so will result in users sharing the same chat history.
 */
const config = { configurable: { sessionId: "1" } };

// Start the conversation
quickCLIPrompt(async (input) => {
  const output = await withHistory.invoke({ input }, config);
  console.log(output);
});
