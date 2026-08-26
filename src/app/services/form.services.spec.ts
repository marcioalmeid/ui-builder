import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { FormService } from './form.services';
import { FormField } from '../models/field';

function makeTextField(id: string, label = 'Field', required = false): FormField {
  return { id, type: 'text', label, icon: 'text_fields', required };
}

function resetStorage(): void {
  localStorage.clear();
}

describe('FormService', () => {
  let service: FormService;

  beforeEach(() => {
    resetStorage();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(FormService);
  });

  it('creates an active template on bootstrap', () => {
    expect(service.activeTemplate()).toBeDefined();
    expect(service.activeTemplateId()).toBeTruthy();
  });

  it('allows only one active template per department', () => {
    // Mock departments so cloneTemplate can find a free one
    const deptService = (service as any).departmentService;
    const originalDepartments = deptService.departments();
    deptService._departments.set(['print', 'marketing', 'sales', 'engineering']);

    try {
      const first = service.createTemplate('Ads A', ['print']);
      expect(first.success).toBe(true);

      const second = service.createTemplate('Ads B', ['print']);
      expect(second.success).toBe(false);
      expect(second.error).toMatch(/Only one template per department/);

      const clone = service.cloneTemplate();
      expect(clone.success).toBe(true);
      const cloned = service.activeTemplate();
      expect(cloned?.departments).not.toContain('print');
    } finally {
      deptService._departments.set(originalDepartments);
    }
  });

  it('adds and looks up a field via the cached index', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const field = makeTextField(crypto.randomUUID(), 'Title');
    service.addField(field, rowId);

    expect(service.getFieldLabel(field.id)).toBe('Title');
    expect(service.selectedField()).toBeUndefined();
    service.setSelectedField(field.id);
    expect(service.selectedField()?.id).toBe(field.id);
  });

  it('updateField is undoable (regression #1)', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const field = makeTextField(crypto.randomUUID(), 'Original');
    service.addField(field, rowId);

    service.updateField(field.id, { label: 'Renamed' });
    expect(service.getFieldLabel(field.id)).toBe('Renamed');

    service.undo();
    expect(service.getFieldLabel(field.id)).toBe('Original');
    expect(service.canRedo()).toBe(true);
  });

  it('updateWorkflowRule is undoable (regression #1)', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rule = service.addWorkflowRule('My rule');

    service.updateWorkflowRule(rule.id, { name: 'Renamed rule' });
    expect(service.workflowRules()[0].name).toBe('Renamed rule');

    service.undo();
    expect(service.workflowRules()[0].name).toBe('My rule');
  });

  it('moveField relocates a field between rows', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowA = service.rows()[0].id;

    service.addRow();
    service.addRow();
    const rowB = service.rows()[1].id;

    const field = makeTextField(crypto.randomUUID(), 'Mover');
    service.addField(field, rowA);

    service.moveField(field.id, rowA, rowB);
    expect(service.findRowByFieldId(field.id)?.id).toBe(rowB);
    expect(service.rows()[0].fields).toHaveLength(0);
  });

  it('moveField keeps the field when target row is invalid', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowA = service.rows()[0].id;
    const field = makeTextField(crypto.randomUUID(), 'Stay put');
    service.addField(field, rowA);

    service.moveField(field.id, rowA, 'missing-row');
    expect(service.findRowByFieldId(field.id)?.id).toBe(rowA);
    expect(service.rows()[0].fields).toHaveLength(1);
  });

  it('rejects duplicate entity field mappings', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const name = makeTextField(crypto.randomUUID(), 'Name');
    const company = makeTextField(crypto.randomUUID(), 'Company');
    service.addField(name, rowId);
    service.addField(company, rowId);

    service.updateField(name.id, {
      entityMapping: { catalogId: 'task-types', entityFieldKey: 'description' },
    });
    service.updateField(company.id, {
      entityMapping: { catalogId: 'task-types', entityFieldKey: 'description' },
    });

    const rows = service.rows();
    const mappedName = rows[0].fields.find((field) => field.id === name.id);
    const mappedCompany = rows[0].fields.find((field) => field.id === company.id);
    expect(mappedName?.entityMapping).toEqual({
      catalogId: 'task-types',
      entityFieldKey: 'description',
    });
    expect(mappedCompany?.entityMapping).toBeUndefined();
  });

  it('generateForm delegates to the extracted code generator', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    service.addField(makeTextField(crypto.randomUUID(), 'Title'), rowId);

    const code = service.generateForm();
    expect(code).toContain('app-generated-form');
    expect(code).toContain('@Component');
  });
});