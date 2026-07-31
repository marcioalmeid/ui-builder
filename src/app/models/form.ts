import { FormField } from "./field";

export interface FormRow {
  id: string;
  templateId: string;
  fields: FormField[];
}
  