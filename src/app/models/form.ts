import { FormField } from "./field";

export interface FormRow {
  id: string;
  formId: string;
  fields: FormField[];
}
  