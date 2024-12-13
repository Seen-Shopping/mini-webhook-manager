import { Handler } from "@netlify/functions";
import { updateAirtableRecord } from "./utils/airtable";

const feedbackOptionValues = {
  love_action: "Love",
  like_action: "Like",
  hate_action: "Hate",
};

type ItemActionValue = {
  lookBookItemId: string;
};

const processItemActions = async (
  actionId: keyof typeof feedbackOptionValues,
  value: string
) => {
  const itemActionValue = JSON.parse(value) as ItemActionValue;
  const updatedRecord = await updateAirtableRecord(
    itemActionValue.lookBookItemId,
    {
      Feedback: feedbackOptionValues[actionId],
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
  console.log(updatedRecord);
  return updatedRecord;
};

const processPurchaseAction = async (value: string) => {
  const itemActionValue = JSON.parse(value) as ItemActionValue;
  const updatedRecord = await updateAirtableRecord(
    itemActionValue.lookBookItemId,
    {
      Purchased: true,
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
  console.log(updatedRecord);
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

  try {
    const body = JSON.parse(event.body ? event.body : "");

    // Slack stringified payload needs to be parsed
    const payload = JSON.parse(body.payload);
    // Handle button clicks
    if (payload.type === "block_actions") {
      const action = payload.actions[0];
      const actionId = action.action_id;
      const value = action.value;
      console.log(actionId);
      if (Object.keys(feedbackOptionValues).includes(actionId)) {
        await processItemActions(actionId, value);
        return {
          statusCode: 200,
          body: "",
        };
      } else if (actionId === "purchase_action") {
        await processPurchaseAction(value);
        return {
          statusCode: 200,
          body: "",
        };
      } else {
        return {
          statusCode: 400,
          body: "Unsupported action type",
        };
      }
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
