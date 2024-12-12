"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const airtable_1 = require("./integrations/airtable");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const itemActionFields = {
    love_action: "love",
    like_action: "like",
    hate_action: "hate",
    purchased_action: "purchased",
};
const processItemActions = (actionId, value, userId) => {
    const itemActionValue = JSON.parse(value);
    (0, airtable_1.updateAirtableRecord)(itemActionValue.lookBookItemId, {
        [itemActionFields[actionId]]: true,
    }, "Look Book Items");
};
app.post("/slack/actions", (req, res) => {
    const payload = JSON.parse(req.body.payload); // Slack sends the payload as a string
    // Handle button clicks
    if (payload.type === "block_actions") {
        const action = payload.actions[0];
        const actionId = action.action_id;
        const value = action.value;
        const userId = payload.user.id; // User who clicked the button
        if (actionId in itemActionFields) {
            processItemActions(actionId, value, userId);
            res.status(200).send(); // Acknowledge the action
        }
        else {
            res.status(400).send("Unsupported action type");
        }
    }
    else {
        res.status(400).send("Unsupported payload type");
    }
});
app.listen(process.env.PORT || 3000, () => {
    console.log("Slack action endpoint running on port 3000");
});
