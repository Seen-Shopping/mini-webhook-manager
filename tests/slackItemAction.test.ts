// tests/webhook.test.ts
import request from "supertest";
import express from "express";
import { json } from "body-parser";

// Import the app from your main file
const app = express();
app.use(json());

// Define the webhook endpoint for testing
app.post("/webhook", (req, res) => {
  console.log("Received webhook:", req.body);
  res.status(200).send("Webhook received");
});

describe("Webhook Endpoint", () => {
  it("should respond with 200 and a message when a valid payload is sent", async () => {
    const response = await request(app)
      .post("/webhook")
      .send({ message: "Hello, world!" }) // Example payload
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Webhook received");
  });

  it("should respond with 200 and a message for an empty payload", async () => {
    const response = await request(app)
      .post("/webhook")
      .send({}) // Empty payload
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Webhook received");
  });
});
