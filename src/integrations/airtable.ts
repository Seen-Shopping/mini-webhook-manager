import Airtable from "airtable";
import dotenv from "dotenv";
dotenv.config();

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ""
);

interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
}

export const updateAirtableRecord = async (
  recordId: string,
  updatedFields: object,
  table: string
): Promise<AirtableRecord> => {
  try {
    console.log("Updating Airtable record:", recordId, updatedFields);
    const response = await base(table).update(recordId, updatedFields);
    console.log("Airtable response:", response);
    return response;
  } catch (error) {
    console.error("Error updating Airtable record:", error);
    throw new Error("Failed to update Airtable record");
  }
};
