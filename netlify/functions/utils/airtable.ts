import Airtable, { FieldSet } from "airtable";
import dotenv from "dotenv";

dotenv.config();

export const updateAirtableRecord = (
  recordId: string,
  fields: Partial<FieldSet>,
  tableName: string
) => {
  console.log(fields, recordId, tableName);
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID || ""
  );

  return base(tableName).update(recordId, fields, { typecast: true });
};
