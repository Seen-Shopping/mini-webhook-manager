import { Handler } from "@netlify/functions";
import { updateAirtableRecord } from "./utils/airtable";

const feedbackOptionValues = {
  love: "Love",
  like: "Like",
  hate: "Hate",
};

type ItemActionValue = {
  lookBookItemId: string;
};

const processItemActions = async (
  actionId: keyof typeof feedbackOptionValues,
  value: string
) => {
  const updatedRecord = await updateAirtableRecord(
    {
      Feedback: feedbackOptionValues[actionId],
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
  console.log(updatedRecord);
  return updatedRecord;
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

const processFeedbackAction = async (
  feedbackOption: keyof typeof feedbackOptionValues,
  recordId: string
) => {
  return await processItemActions(feedbackOption, recordId);
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
    console.log(payload, payload.type);
    // Handle button clicks
    if (payload.type === "block_actions") {
      /* 
					"action_id": "feedback:love",
					"value": "RECORD_ID"

          AND 

          "action_id": "purchase",
					"value": "RECORD_ID"
      */

      const [actionId, metadata] = payload.actions[0].action_id.split(":");
      console.log(actionId, metadata);
      switch (actionId) {
        case "feedback":
          await processFeedbackAction(metadata, payload.actions[0].value);
          return {
            statusCode: 200,
            body: "",
          };
        case "purchase":
          await processPurchaseAction(payload.actions[0].value);
          return {
            statusCode: 200,
            body: "",
          };
        default:
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
