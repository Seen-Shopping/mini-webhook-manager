import { Handler } from "@netlify/functions";

import { updateAirtableRecord } from "./utils/airtable";
import { manageReactions } from "./utils/slack";

const FEEDBACK_OPTIONS = {
  love: "Love",
  like: "Like",
  hate: "Hate",
} as const;

export const FEEDBACK_EMOJIS = {
  love: "heart",
  like: "thumbsup",
  hate: "x",
} as const;

export const PURCHASE_EMOJI = "shopping_bags";

type FeedbackType = keyof typeof FEEDBACK_OPTIONS;
type ActionType = "feedback" | "purchase";

const processFeedbackAction = async (
  feedbackType: FeedbackType,
  recordId: string
) => {
  return await updateAirtableRecord(
    recordId,
    {
      Feedback: FEEDBACK_OPTIONS[feedbackType],
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
};

const processPurchaseAction = async (recordId: string) => {
  const updatedRecord = await updateAirtableRecord(
    recordId,
    {
      Purchased: true,
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
  return updatedRecord;
};

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: "Missing body in the request",
    };
  }

  try {
    // Parse the URL-encoded body using URLSearchParams
    const params = new URLSearchParams(event.body || "");

    // Get the `payload` parameter and parse it as JSON
    const payloadString = params.get("payload");
    if (!payloadString) {
      throw new Error("Missing payload in the request body.");
    }
    const payload = JSON.parse(payloadString);
    // Handle button clicks
    if (payload.type === "block_actions") {
      const [actionType, metadata] = payload.actions[0].action_id.split(
        ":"
      ) as [ActionType, string];
      const { channel, message, actions } = payload;

      switch (actionType) {
        case "feedback": {
          const feedbackType = metadata as FeedbackType;
          const feedbackEmoji = FEEDBACK_EMOJIS[feedbackType];

          processFeedbackAction(feedbackType, actions[0].value);
          manageReactions(channel.id, message.ts, {
            add: feedbackEmoji,
            remove: Object.values(FEEDBACK_EMOJIS).filter(
              (emoji) => emoji !== feedbackEmoji
            ),
          });
          break;
        }
        case "purchase": {
          processPurchaseAction(actions[0].value);
          manageReactions(channel.id, message.ts, {
            add: PURCHASE_EMOJI,
          });
          break;
        }
        default:
          return {
            statusCode: 400,
            body: "Unsupported action type",
          };
      }

      return {
        statusCode: 200,
        body: "",
      };
    } else {
      return {
        statusCode: 400,
        body: "Unsupported payload type",
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
