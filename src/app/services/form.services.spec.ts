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

  it('adds and looks up a field via the cached index', () => {
    service.createTemplate('My Form', 'general');
    const rowId = service.rows()[0].id;
    const field = makeTextField(crypto.randomUUID(), 'Title');
    service.addField(field, rowId);

    expect(service.getFieldLabel(field.id)).toBe('Title');
    expect(service.selectedField()).toBeUndefined();
    service.setSelectedField(field.id);
    expect(service.selectedField()?.id).toBe(field.id);
  });

  it('updateField is undoable (regression #1)', () => {
    service.createTemplate('My Form', 'general');
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
    service.createTemplate('My Form', 'general');
    const rule = service.addWorkflowRule('My rule');

    service.updateWorkflowRule(rule.id, { name: 'Renamed rule' });
    expect(service.workflowRules()[0].name).toBe('Renamed rule');

    service.undo();
    expect(service.workflowRules()[0].name).toBe('My rule');
  });

  it('moveField relocates a field between rows', () => {
    service.createTemplate('My Form', 'general');
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

  it('generateForm delegates to the extracted code generator', () => {
    service.createTemplate('My Form', 'general');
    const rowId = service.rows()[0].id;
    service.addField(makeTextField(crypto.randomUUID(), 'Title'), rowId);

    const code = service.generateForm();
    expect(code).toContain('app-generated-form');
    expect(code).toContain('@Component');
  });
});