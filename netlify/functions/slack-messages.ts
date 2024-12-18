import { Handler } from "@netlify/functions";

import { updateAirtableRecord } from "./utils/airtable";
import { manageReactions } from "./utils/slack";

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

    console.log(params);

    if (params.get("challenge")) {
      return {
        statusCode: 200,
        body: params.get("challenge"),
      };
    }

    // Get the `payload` parameter and parse it as JSON
    const payloadString = params.get("payload");
    if (!payloadString) {
      throw new Error("Missing payload in the request body.");
    }
    const payload = JSON.parse(payloadString);

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
