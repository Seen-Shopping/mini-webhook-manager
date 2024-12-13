import Airtable from "airtable";
import dotenv from "dotenv";

dotenv.config();

export const updateAirtableRecord = (
  recordId: string,
  fields: object,
  tableName: string
) => {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID || ""
  );

  return base(tableName).update(recordId, fields);
};
