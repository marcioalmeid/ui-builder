import { Injectable, signal } from "@angular/core";
import { FormRow } from "../models/form";
import { FormField } from "../models/field";

@Injectable({
  providedIn: "root",
})
export class FormService {
    private _rows = signal<FormRow[]>([]);
    public readonly rows = this._rows.asReadonly();

    addField(field: FormField, rowId: string, index?: number) {
         const rows = this._rows();
         const newRows = rows.map((row) => {
            if (row.id === rowId) {
                 const updatedFields = [...row.fields];
                 if (index !== undefined) {
                     updatedFields.splice(index, 0, field);
                 } else {
                     updatedFields.push(field);
                 }
                 return { ...row, fields: updatedFields };
             }
             return row;
         });
         this._rows.set(newRows);
    }
       
  constructor() {
    this._rows.set([
      {
        id: crypto.randomUUID(),
        formId: "form1",
        fields: [],
      },
    ]);
  }
}