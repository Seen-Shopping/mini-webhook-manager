import express, { Request, Response } from "express";
import { updateAirtableRecord } from "./integrations/airtable";

import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const feedbackOptionValues = {
  love_action: "Love",
  like_action: "Like",
  hate_action: "Hate",
};

type ItemActionValue = {
  lookBookItemId: string;
};

const processItemActions = (
  actionId: keyof typeof feedbackOptionValues,
  value: string
) => {
  const itemActionValue = JSON.parse(value) as ItemActionValue;
  updateAirtableRecord(
    itemActionValue.lookBookItemId,
    {
      Feedback: feedbackOptionValues[actionId],
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
};

const processPurchaseAction = (value: string) => {
  const itemActionValue = JSON.parse(value) as ItemActionValue;
  updateAirtableRecord(
    itemActionValue.lookBookItemId,
    {
      Purchased: true,
    },
    process.env.AIRTABLE_LOOKBOOK_ITEMS_TABLE_NAME || ""
  );
};

app.post("/slack/actions", (req: Request, res: Response) => {
  const payload = JSON.parse(req.body.payload); // Slack sends the payload as a string

  // Handle button clicks
  if (payload.type === "block_actions") {
    const action = payload.actions[0];
    const actionId = action.action_id;
    const value = action.value;

    if (actionId in feedbackOptionValues) {
      processItemActions(actionId, value);
      res.status(200).send(); // Acknowledge the action
    } else if (actionId === "purchase_action") {
      processPurchaseAction(value);
      res.status(200).send(); // Acknowledge the action
    } else {
      res.status(400).send("Unsupported action type");
    }
  } else {
    res.status(400).send("Unsupported payload type");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Slack action endpoint running on port 3000");
});
