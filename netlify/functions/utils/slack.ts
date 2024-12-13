import { WebClient } from "@slack/web-api";

/**
 * Adds a reaction to a message in a Slack channel, ensuring only one of the specified emojis is active at a time.
 * @param {string} channel - The ID of the channel where the message is located.
 * @param {string} timestamp - The timestamp of the message to which the reaction will be added.
 * @param {string[]} emojisToRemove - An array of emoji names to remove from the message.
 * @param {string} emojiToAdd - The emoji name to be added as a reaction.
 */
export const manageReactions = async (
  channel: string,
  timestamp: string,
  { add, remove }: { add: string; remove?: string[] }
) => {
  // Read a token from the environment variables
  const token = process.env.SLACK_TOKEN;

  // Initialize the Slack WebClient
  const web = new WebClient(token);

  try {
    // Remove existing reactions
    if (remove) {
      for (const emoji of remove) {
        try {
          await web.reactions.remove({
            channel: channel,
            timestamp: timestamp,
            name: emoji,
          });
        } catch (error: any) {
          /*
            error is 
            data: {
              ok: false,
              error: "no_reaction",
              response_metadata: { scopes: [Array], acceptedScopes: [Array] },
            },
          }
            */
          if (error.data.error === "no_reaction") {
            console.log(`Reaction ${emoji} not found. Moving on...`);
          } else {
            console.error(`Error removing reaction ${emoji}: ${error}`);
          }
        }
      }
    }

    // Add the new reaction
    const result = await web.reactions.add({
      channel: channel,
      timestamp: timestamp,
      name: add,
    });

    console.log(
      `Successfully added reaction ${add} to message ${timestamp} in channel ${channel}`
    );
    return result;
  } catch (error) {
    console.error(`Error managing reactions: ${error}`);
    throw error;
  }
};
