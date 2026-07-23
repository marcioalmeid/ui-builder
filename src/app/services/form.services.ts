import { Injectable, signal, computed } from "@angular/core";
import { FormRow } from "../models/form";
import { FormField } from "../models/field";

@Injectable({
  providedIn: "root",
})
export class FormService {
  private _rows = signal<FormRow[]>([]);
  private _selectedFieldId = signal<string | null>(null);
  public readonly selectedField = computed(() =>
    this._rows()
      .flatMap((row) => row.fields)
      .find((field) => field.id === this._selectedFieldId())
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
      fields: [],
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
      if (row.id === sourceRowId) {
        sourceRowIndex = rowIndex;
        sourceFieldIndex = row.fields.findIndex((field) => field.id === fieldId);
        if (sourceFieldIndex >= 0) {
          fieldToMove = row.fields[sourceFieldIndex];
        }
      }
    });
    if (!fieldToMove) {
      return;
    }
    const newRows = [...rows];
    const fieldsWithRemovedField = newRows[sourceRowIndex].fields.filter((field) => field.id !== fieldId);
    newRows[sourceRowIndex].fields = fieldsWithRemovedField;
    const targetRowIndex = newRows.findIndex((row) => row.id === targetRowId);
    if (targetRowIndex >= 0) {
      const targetFields = [...newRows[targetRowIndex].fields];
      targetFields.splice(targetIndex, 0, fieldToMove);
      newRows[targetRowIndex].fields = targetFields;
    }
  }

  updateField(fieldId: string, data: Partial<FormField>) {
    const rows = this._rows();
    const newRows = rows.map((row) => ({
      ...row,
      fields: row.fields.map((field) =>
        field.id === fieldId ? { ...field, ...data } : field
      ),
    }));
    this._rows.set(newRows);
  }

  setSelectedField(fieldId: string) {
    this._selectedFieldId.set(fieldId);
  }

  moveRowUp(rowId: string) {
    const rows = [...this._rows()];
    const index = rows.findIndex((row) => row.id === rowId);
    if (index > 0) {
      [rows[index], rows[index - 1]] = [rows[index - 1], rows[index]];
      this._rows.set(rows);
    }
  }

  moveRowDown(rowId: string) {
    const rows = this._rows();
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < rows.length - 1) {
      const movedRow = rows.splice(index, 1)[0];
      const newRow = { ...movedRow };
      newRow.id = crypto.randomUUID();
      this._rows.set([...rows, newRow]);
    }
  }

  /**
   * Gera o código completo de um componente Angular baseado no formId fornecido.
   */
  generateForm(formId: string) {
    const rows = this._rows().filter((row) => row.formId === formId);
    const template = this.generateTemplate(rows);

    let code = this.generateImports();
    code += this.generateComponentDecorator(template);
    code += this.generateFormBody(rows);
    console.log(code);
    return code;
  }

  private generateImports(): string {
    return `import { Component, OnInit } from '@angular/core';\n` +
           `import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';\n` +
           `import { CommonModule } from '@angular/common';\n\n`;
  }

  private generateComponentDecorator(template: string): string {
    return `@Component({\n` +
           `  selector: 'app-generated-form',\n` +
           `  standalone: true,\n` +
           `  imports: [CommonModule, ReactiveFormsModule],\n` +
           `  template: \`${template}\`\n` +
           `})\n`;
  }

  private generateFormBody(rows: FormRow[]): string {
    let code = `export class GeneratedForm implements OnInit {\n`;
    code += `  form: FormGroup;\n\n`;
    code += `  constructor() {\n`;
    code += `    this.form = new FormGroup({\n`;

    for (const row of rows) {
      for (const field of row.fields) {
        const validator = field.required ? ', Validators.required' : '';
        let initialValue: string | boolean = "''";
        if (field.type === 'checkbox') initialValue = false;

        code += `      ${field.id}: new FormControl(${initialValue}${validator}),\n`;
      }
    }

    code += `    });\n`;
    code += `  }\n\n`;
    code += `  ngOnInit(): void {\n`;
    code += `  }\n`;
    code += `}\n`;
    return code;
  }

  private generateTemplate(rows: FormRow[]): string {
    let template = '';
    for (const row of rows) {
      template += `<div class="form-row">\n`;
      for (const field of row.fields) {
        template += `  <div class="field-container">\n`;
        template += `    <label for="${field.id}">${field.label}</label>\n`;

        if (field.type === 'text') {
          template += `    <input type="text" id="${field.id}" formControlName="${field.id}" placeholder="${field.placeholder || ''}">\n`;
        } else if (field.type === 'radio') {
          template += `    <div class="radio-group">\n`;
          for (const option of field.options || []) {
            template += `      <label>\n`;
            template += `        <input type="radio" name="${field.id}" [value]="'${option.value}'" formControlName="${field.id}"> ${option.label}\n`;
            template += `      </label>\n`;
          }
          template += `    </div>\n`;
        } else if (field.type === 'checkbox') {
          template += `    <input type="checkbox" id="${field.id}" formControlName="${field.id}">\n`;
        } else if (field.type === 'select') {
          template += `    <select id="${field.id}" formControlName="${field.id}">\n`;
          for (const option of field.options || []) {
            template += `      <option [value]="'${option.value}'">${option.label}</option>\n`;
          }
          template += `    </select>\n`;
        } else {
          template += `    <input type="text" id="${field.id}" formControlName="${field.id}" placeholder="${field.placeholder || ''}">\n`;
        }
        template += `  </div>\n`;
      }
      template += `</div>\n`;
    }
    return template;
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
