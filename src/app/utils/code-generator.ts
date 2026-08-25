import { FormRow } from '../models/form';
import { FormField } from '../models/field';
import { nestedValueToExportExpression } from './nested-value';

/** Escape HTML special characters to prevent XSS in generated templates. */
function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFieldKey(fieldId: string): string {
  return fieldId.replace(/-/g, '_');
}

function getApiFields(rows: FormRow[]): FormField[] {
  return rows
    .flatMap((row) => row.fields)
    .filter((field) => field.optionsSource === 'api' && field.dataSource?.url);
}

function generateImports(hasApiFields: boolean): string {
  let code =
    `import { Component, OnInit, signal } from '@angular/core';\n` +
    `import { CommonModule } from '@angular/common';\n`;

  if (hasApiFields) {
    code += `import { HttpClient, provideHttpClient } from '@angular/common/http';\n`;
  }

  return `${code}\n`;
}

function generateComponentDecorator(
  template: string,
  hasApiFields: boolean
): string {
  const providers = hasApiFields
    ? `,\n  providers: [provideHttpClient()]`
    : '';
  return (
    `@Component({\n` +
    `  selector: 'app-generated-form',\n` +
    `  standalone: true,\n` +
    `  imports: [CommonModule]${providers},\n` +
    `  template: \`${template}\`\n` +
    `})\n`
  );
}

function getInitialFieldValue(field: FormField): string {
  if (field.type === 'checkbox') {
    return 'false';
  }
  if (field.type === 'cost-breakdown') {
    const pct = field.managementFeePercent ?? 15;
    return `{ grossBudget: '', managementFeePercent: ${pct}, additionalFees: [] }`;
  }
  if (field.type === 'section-header' || field.type === 'button') {
    return 'null';
  }
  return "''";
}

function bindInput(fieldId: string, type: string, placeholder: string): string {
  return (
    `[value]="jobData()['${fieldId}'] ?? ''" ` +
    `(input)="updateField('${fieldId}', $any($event.target).value)" ` +
    `id="${fieldId}" type="${type}" placeholder="${placeholder}" class="w-full p-2 border rounded shadow-sm"`
  );
}

function generateFormBody(rows: FormRow[], apiFields: FormField[]): string {
  const allFields = rows.flatMap((row) => row.fields);
  const requiredFields = allFields.filter((f) => f.required);

  let code = `export class GeneratedForm implements OnInit {\n`;
  code += `  jobData = signal<Record<string, unknown>>({\n`;

  for (const field of allFields) {
    if (field.type === 'section-header' || field.type === 'button') continue;
    code += `    '${field.id}': ${getInitialFieldValue(field)},\n`;
  }

  code += `  });\n\n`;
  code += `  validationErrors = signal<string[]>([]);\n`;

  for (const field of apiFields) {
    const key = sanitizeFieldKey(field.id);
    code += `  ${key}Options = signal<{ label: string; value: string }[]>([]);\n`;
  }

  code += `\n  constructor(`;
  code += apiFields.length > 0 ? `private http: HttpClient` : ``;
  code += `) {}\n\n`;

  code += `  updateField(fieldId: string, value: unknown): void {\n`;
  code += `    this.jobData.update((data) => ({ ...data, [fieldId]: value }));\n`;
  code += `  }\n\n`;

  code += `  submit(): void {\n`;
  code += `    const data = this.jobData();\n`;
  code += `    const errors: string[] = [];\n`;
  for (const field of requiredFields) {
    if (field.type === 'section-header' || field.type === 'button') continue;
    const label = field.label.replace(/'/g, "\\'");
    if (field.type === 'cost-breakdown') {
      code += `    const ${sanitizeFieldKey(field.id)}Val = data['${field.id}'] as { grossBudget?: unknown } | undefined;\n`;
      code += `    if (!${sanitizeFieldKey(field.id)}Val?.grossBudget) errors.push('${label}: gross budget is required');\n`;
      continue;
    }
    code += `    if (data['${field.id}'] === '' || data['${field.id}'] === null || data['${field.id}'] === undefined`;
    if (field.type === 'checkbox') {
      code += ` || data['${field.id}'] === false`;
    }
    code += `) errors.push('${label} is required');\n`;
  }
  code += `    this.validationErrors.set(errors);\n`;
  code += `    if (errors.length) return;\n`;
  code += `    console.log('Submitted job data:', data);\n`;
  code += `  }\n\n`;

  code += `  ngOnInit(): void {\n`;

  for (const field of apiFields) {
    const key = sanitizeFieldKey(field.id);
    const source = field.dataSource!;
    const method = source.method ?? 'GET';
    const responsePath = source.responsePath ?? '';
    const params = source.params ?? {};
    const labelExpr = nestedValueToExportExpression('item', source.labelKey);
    const valueExpr = nestedValueToExportExpression('item', source.valueKey);

    if (method === 'POST') {
      code += `    this.http.post<unknown>('${source.url}', ${JSON.stringify(params)}).subscribe((response) => {\n`;
    } else if (Object.keys(params).length > 0) {
      code += `    this.http.get<unknown>('${source.url}', { params: ${JSON.stringify(params)} }).subscribe((response) => {\n`;
    } else {
      code += `    this.http.get<unknown>('${source.url}').subscribe((response) => {\n`;
    }

    code += `      const items = this.extractItems(response, '${responsePath}');\n`;
    code += `      this.${key}Options.set(items.map((item: unknown) => {\n`;
    code += `        if (item === null || item === undefined) return { label: '', value: '' };\n`;
    code += `        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {\n`;
    code += `          const v = String(item); return { label: v, value: v };\n`;
    code += `        }\n`;
    code += `        const record = item as Record<string, unknown>;\n`;
    code += `        return {\n`;
    code += `          label: String(${labelExpr.replace(/item/g, 'record')} ?? ''),\n`;
    code += `          value: String(${valueExpr.replace(/item/g, 'record')} ?? ''),\n`;
    code += `        };\n`;
    code += `      }));\n`;
    code += `    });\n`;
  }

  if (apiFields.length > 0) {
    code += `\n  private extractItems(response: unknown, responsePath: string): unknown[] {\n`;
    code += `    if (Array.isArray(response)) return response;\n`;
    code += `    if (!responsePath) return [];\n`;
    code += `    let current: unknown = response;\n`;
    code += `    for (const segment of responsePath.split('.')) {\n`;
    code += `      current = (current as Record<string, unknown>)?.[segment];\n`;
    code += `    }\n`;
    code += `    return Array.isArray(current) ? current : [];\n`;
    code += `  }\n`;
  }

  code += `  }\n`;
  code += `}\n`;
  return code;
}

function generateTemplate(rows: FormRow[], hasApiFields: boolean): string {
  let template = `<div class="p-6">\n`;
  template += `  <div class="py-6 flex flex-col gap-4 shadow-md rounded-lg border bg-gray-0">\n`;

  if (rows.some((r) => r.fields.some((f) => f.required))) {
    template += `    @if (validationErrors().length) {\n`;
    template += `      <ul class="text-red-600 text-sm list-disc pl-5">\n`;
    template += `        @for (error of validationErrors(); track error) {\n`;
    template += `          <li>{{ error }}</li>\n`;
    template += `        }\n`;
    template += `      </ul>\n`;
    template += `    }\n`;
  }

  for (const row of rows) {
    template += `    <div class="flex gap-4 flex-wrap">\n`;
    for (const field of row.fields) {
      if (field.type === 'section-header') {
        template += `      <div class="basis-full pt-2 pb-1">\n`;
        template += `        <h3 class="text-xs font-bold tracking-wide uppercase text-gray-500 border-t border-gray-200 pt-4">${sanitizeHtml(field.label)}</h3>\n`;
        if (field.hint) {
          template += `        <p class="text-xs text-gray-400 mt-1">${sanitizeHtml(field.hint)}</p>\n`;
        }
        template += `      </div>\n`;
        continue;
      }
      if (field.type === 'button') {
        template += `      <div class="shrink-0">\n`;
        template += `        <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded shadow-sm">${sanitizeHtml(field.label)}</button>\n`;
        if (field.hint) {
          template += `        <p class="text-xs text-gray-500 mt-1">${sanitizeHtml(field.hint)}</p>\n`;
        }
        template += `      </div>\n`;
        continue;
      }

      const hintHtml = field.hint
        ? `        <p class="text-xs text-gray-500 mb-1">${sanitizeHtml(field.hint)}</p>\n`
        : '';

      template += `      <div class="flex-1">\n`;
      if (field.type !== 'cost-breakdown') {
        template += `        <label class="block text-sm font-medium mb-1" for="${field.id}">${sanitizeHtml(field.label)}${field.required ? ' *' : ''}</label>\n`;
        template += hintHtml;
      }

      if (field.type === 'text') {
        const inputType =
          field.inputType === 'currency' ? 'number' : field.inputType || 'text';
        template += `        <input ${bindInput(field.id, inputType, field.placeholder || '')}>\n`;
      } else if (field.type === 'cost-breakdown') {
        template += `        <div class="border rounded p-4 bg-gray-50">\n`;
        template += `          <p class="font-medium mb-2">${sanitizeHtml(field.label)}</p>\n`;
        if (field.hint) template += `          <p class="text-xs text-gray-500 mb-3">${sanitizeHtml(field.hint)}</p>\n`;
        template += `          <p class="text-sm text-gray-600">Cost breakdown block — use runtime component in app.</p>\n`;
        template += `        </div>\n`;
      } else if (field.type === 'radio') {
        template += `        <div class="flex flex-col gap-2">\n`;
        if (field.optionsSource === 'api' && hasApiFields) {
          const key = sanitizeFieldKey(field.id);
          template += `          @for (option of ${key}Options(); track option.value) {\n`;
          template += `            <label class="flex items-center gap-2">\n`;
          template += `              <input type="radio" name="${field.id}" [checked]="jobData()['${field.id}'] === option.value" (change)="updateField('${field.id}', option.value)"> {{ option.label }}\n`;
          template += `            </label>\n`;
          template += `          }\n`;
        } else {
          for (const option of field.options || []) {
            template += `          <label class="flex items-center gap-2">\n`;
            template += `              <input type="radio" name="${field.id}" [checked]="jobData()['${field.id}'] === '${option.value}'" (change)="updateField('${field.id}', '${option.value}')"> ${sanitizeHtml(option.label)}\n`;
            template += `          </label>\n`;
          }
        }
        template += `        </div>\n`;
      } else if (field.type === 'checkbox') {
        template += `        <input type="checkbox" id="${field.id}" [checked]="!!jobData()['${field.id}']" (change)="updateField('${field.id}', $any($event.target).checked)" class="h-5 w-5">\n`;
      } else if (field.type === 'dropdown') {
        template += `        <select id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (change)="updateField('${field.id}', $any($event.target).value)" class="w-full p-2 border rounded shadow-sm">\n`;
        template += `          <option value="" disabled>${field.placeholder || 'Select an option'}</option>\n`;
        if (field.optionsSource === 'api' && hasApiFields) {
          const key = sanitizeFieldKey(field.id);
          template += `          @for (option of ${key}Options(); track option.value) {\n`;
          template += `            <option [value]="option.value">{{ option.label }}</option>\n`;
          template += `          }\n`;
        } else {
          for (const option of field.options || []) {
            template += `          <option value="${option.value}">${sanitizeHtml(option.label)}</option>\n`;
          }
        }
        template += `        </select>\n`;
      } else if (field.type === 'textarea') {
        template += `        <textarea id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (input)="updateField('${field.id}', $any($event.target).value)" placeholder="${field.placeholder || ''}" class="w-full p-2 border rounded shadow-sm"></textarea>\n`;
      } else if (field.type === 'datepicker') {
        template += `        <input type="date" id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (input)="updateField('${field.id}', $any($event.target).value)" class="w-full p-2 border rounded shadow-sm">\n`;
      } else {
        template += `        <input ${bindInput(field.id, 'text', field.placeholder || '')}>\n`;
      }
      template += `      </div>\n`;
    }
    template += `    </div>\n`;
  }

  template += `    <button type="button" (click)="submit()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded shadow-sm">Submit</button>\n`;
  template += `  </div>\n`;
  template += `</div>\n`;
  return template;
}

export function generateAngularFormCode(rows: FormRow[]): string {
  const apiFields = getApiFields(rows);
  const template = generateTemplate(rows, apiFields.length > 0);
  let code = generateImports(apiFields.length > 0);
  code += generateComponentDecorator(template, apiFields.length > 0);
  code += generateFormBody(rows, apiFields);
  return code;
}
