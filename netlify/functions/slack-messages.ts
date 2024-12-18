import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Allow only POST requests
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
    // Parse the incoming JSON body directly
    const body = JSON.parse(event.body);

    console.log(body);
    // Handle Slack's URL verification challenge
    if (body.challenge) {
      return {
        statusCode: 200,
        body: body.challenge,
      };
    }

    // Handle actual events here
    // For example, if a message event:
    // if (body.event && body.event.type === "message") {
    //   console.log("New message event:", body.event);
    //   // do something with the message
    // }

    return {
      statusCode: 200,
      body: "OK",
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
