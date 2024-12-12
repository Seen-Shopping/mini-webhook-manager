"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAirtableRecord = void 0;
const AIRTABLE_API_URL = "https://api.airtable.com/v0/YOUR_BASE_ID";
const AIRTABLE_API_KEY = "YOUR_API_KEY";
const updateAirtableRecord = (recordId, updatedFields, table) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(`${AIRTABLE_API_URL}/${table}/${recordId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields: updatedFields }),
        });
        if (!response.ok) {
            throw new Error(`Error updating Airtable record: ${response.statusText}`);
        }
        const data = yield response.json();
        return data;
    }
    catch (error) {
        console.error("Error updating Airtable record:", error);
        throw new Error("Failed to update Airtable record");
    }
});
exports.updateAirtableRecord = updateAirtableRecord;
