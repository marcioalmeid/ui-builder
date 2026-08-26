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

  it('links exactly one field to a shared list and syncs dataBindingId', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const fieldA = makeTextField(crypto.randomUUID(), 'Dropdown A');
    fieldA.type = 'dropdown';
    const fieldB = makeTextField(crypto.randomUUID(), 'Dropdown B');
    fieldB.type = 'dropdown';
    service.addField(fieldA, rowId);
    service.addField(fieldB, rowId);

    const binding = service.addDataBinding({
      name: 'Shared Users',
      dataCatalogId: 'users',
      dataSource: {
        url: '/api/users',
        labelKey: 'name',
        valueKey: 'id',
      },
      targetFieldIds: [fieldA.id, fieldB.id],
    });

    expect(binding.targetFieldIds).toEqual([fieldA.id]);

    const rows = service.rows();
    const linkedA = rows[0].fields.find((field) => field.id === fieldA.id);
    const linkedB = rows[0].fields.find((field) => field.id === fieldB.id);
    expect(linkedA?.dataBindingId).toBe(binding.id);
    expect(linkedB?.dataBindingId).toBeUndefined();
    expect(linkedA?.optionsSource).toBe('api');
  });

  it('rejects a second field on an occupied shared list', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const fieldA = makeTextField(crypto.randomUUID(), 'Dropdown A');
    fieldA.type = 'dropdown';
    const fieldB = makeTextField(crypto.randomUUID(), 'Dropdown B');
    fieldB.type = 'dropdown';
    service.addField(fieldA, rowId);
    service.addField(fieldB, rowId);

    const binding = service.addDataBinding({
      name: 'List A',
      dataCatalogId: 'users',
      dataSource: {
        url: '/api/users',
        labelKey: 'name',
        valueKey: 'id',
      },
      targetFieldIds: [fieldA.id],
    });

    let linkError: string | undefined;
    service.linkFieldToSharedList(fieldB.id, binding.id).subscribe((result) => {
      linkError = result.error;
    });
    expect(linkError).toMatch(/already linked/i);
    expect(service.getBindingOwningField(fieldA.id)?.id).toBe(binding.id);
    expect(service.getBindingOwningField(fieldB.id)).toBeUndefined();
  });

  it('rejects linking a field already attached to another shared list', () => {
    expect(service.createTemplate('My Form', ['general']).success).toBe(true);
    const rowId = service.rows()[0].id;
    const fieldA = makeTextField(crypto.randomUUID(), 'Dropdown A');
    fieldA.type = 'dropdown';
    const fieldB = makeTextField(crypto.randomUUID(), 'Dropdown B');
    fieldB.type = 'dropdown';
    service.addField(fieldA, rowId);
    service.addField(fieldB, rowId);

    const first = service.addDataBinding({
      name: 'List A',
      dataCatalogId: 'users',
      dataSource: {
        url: '/api/users',
        labelKey: 'name',
        valueKey: 'id',
      },
      targetFieldIds: [fieldA.id],
    });

    const second = service.addDataBinding({
      name: 'List B',
      dataCatalogId: 'platforms',
      dataSource: {
        url: '/api/platforms',
        labelKey: 'name',
        valueKey: 'id',
      },
      targetFieldIds: [fieldA.id, fieldB.id],
    });

    expect(second.targetFieldIds).toEqual([fieldB.id]);
    expect(service.getBindingOwningField(fieldA.id)?.id).toBe(first.id);

    let linkError: string | undefined;
    service.linkFieldToSharedList(fieldA.id, second.id).subscribe((result) => {
      linkError = result.error;
    });
    expect(linkError).toMatch(/already linked/i);
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