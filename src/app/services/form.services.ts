import { Injectable, signal,computed } from "@angular/core";
import { FormRow } from "../models/form";
import { FormField } from "../models/field";

@Injectable({
  providedIn: "root",
})
export class FormService {
  private _rows = signal<FormRow[]>([]);
  private _selectedFieldId = signal<string | null>(null);
  public readonly selectedField = computed(()=>  
    this._rows()
  .flatMap((row)=> row.fields)
  .find(
      (field) => field.id === this._selectedFieldId()),
    );

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

  deleteField(fieldId: string, rowId: string) {
    const newRows = this._rows().map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      return {
        ...row,
        fields: row.fields.filter((field) => field.id !== fieldId),
      };
    });

    this._rows.set(newRows);
  }

  addRow() {
    const newRow = {
      id: crypto.randomUUID(),
      formId: "form1",
      fields: []
    };
    const rows = this._rows();
    this._rows.set([...rows, newRow]);

  }

  deleteRow(rowId: string) {
    if (this._rows().length === 1) {
      return;
    }

    const rows = this._rows();
    this._rows.set(rows.filter((row) => row.id !== rowId));
  }

  moveField(fieldId: string, sourceRowId: string, targetRowId: string, targetIndex: number = -1) {

    const rows = this._rows();

    let fieldToMove: FormField | undefined;
    let sourceRowIndex = -1;
    let sourceFieldIndex = -1;
rows.forEach((row, rowIndex) => {
    if(row.id === sourceRowId){
      sourceRowIndex = rowIndex;
      sourceFieldIndex = row.fields.findIndex((field) => field.id === fieldId);
      if(sourceFieldIndex >=0){
        fieldToMove = row.fields[sourceFieldIndex];
      }
    }
  });
  if(!fieldToMove  ){
    return;
  }
  const newRows = [...rows];
  const fieldsWithRemovedField = newRows[sourceRowIndex].fields.filter((field) => field.id !== fieldId);
  newRows[sourceRowIndex].fields = fieldsWithRemovedField;
  const targetRowIndex = newRows.findIndex((row) => row.id === targetRowId);
  if(targetRowIndex >=0){
     const targetFields = [...newRows[targetRowIndex].fields];
     targetFields.splice(targetIndex, 0, fieldToMove);
     newRows[targetRowIndex].fields = targetFields;
  } 

  
}

  updateField(fieldId: string, data: Partial<FormField>) {
    const rows = this._rows();
    const newRows = rows.map(row => ({
      ...row,
      fields: row.fields.map((field => field.id === fieldId ? { ...field, ...data } : field))}));
      this._rows.set(newRows);
  }

  setSelectedField(fieldId: string) {
    this._selectedFieldId.set(  fieldId); 
  }


   moveRowUp(rowId: string) {
    const rows = [...this._rows()]; // Cria uma cópia do array
    const index = rows.findIndex(row => row.id === rowId);
    if (index > 0) {
      // Troca o elemento atual com o anterior
      [rows[index], rows[index - 1]] = [rows[index - 1], rows[index]];
      this._rows.set(rows);
    }
  }

  moveRowDown(rowId: string) {
    const rows = this._rows();
    const index = rows.findIndex(row => row.id === rowId);
    if (index < rows.length - 1)
      {
        const movedRow = rows.splice(index, 1)[0];
        const newRow = { ...movedRow };
        newRow.id = crypto.randomUUID();
        this._rows.set([...rows, newRow]);
        }
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