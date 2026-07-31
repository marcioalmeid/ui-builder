import { Injectable, signal, computed, inject } from "@angular/core";
import { Observable, of } from "rxjs";
import { FormRow } from "../models/form";
import { ApiDataSource, FormField, RadioOption } from "../models/field";
import { DataBinding } from "../models/data-binding";
import { WorkflowRule, createDefaultWorkflowRule } from "../models/workflow-rule";
import {
  createEmptyTemplate,
  TaskTemplate,
  TemplateStatus,
} from "../models/task-template";
import { DataSourceService, FetchOptionsResult } from "./data-source.service";
import { mergeFieldDataSourceUpdate, mergeFieldUpdate } from "../utils/field-data-source";
import { migrateLegacyVisibilityRules } from "../utils/workflow-migration";
import { nestedValueToExportExpression } from "../utils/nested-value";
import {
  setupStepFromSidebarSection,
  SetupStepId,
  validateTemplateForPublish,
} from "../utils/template-readiness";
import {
  createNewTaskDemoTemplate,
  DEMO_TEMPLATE_SEED_KEY,
} from "../catalog/demo-templates";

export type BuilderSidebarSection = "template" | "fields" | "data" | "rules";

const STORAGE_KEY = "ui-builder-templates-v1";
const LEGACY_STORAGE_KEY = "form-builder-state";

interface PersistedState {
  templates: TaskTemplate[];
  activeTemplateId: string;
  timestamp: number;
}

@Injectable({
  providedIn: "root",
})
export class FormService {
  private dataSourceService = inject(DataSourceService);
  private _templates = signal<TaskTemplate[]>([]);
  private _activeTemplateId = signal<string>("");
  private _rows = signal<FormRow[]>([]);
  private _dataBindings = signal<DataBinding[]>([]);
  private _workflowRules = signal<WorkflowRule[]>([]);
  private _selectedFieldId = signal<string | null>(null);
  private _selectedWorkflowRuleId = signal<string | null>(null);
  private _focusedWorkflowNodeId = signal<string | null>(null);
  private undoStack: PersistedState[] = [];
  private redoStack: PersistedState[] = [];
  private readonly maxUndo = 30;

  public readonly canUndo = signal(false);
  public readonly canRedo = signal(false);
  public readonly sidebarFocus = signal<{
    section: BuilderSidebarSection;
    tick: number;
  } | null>(null);
  public readonly previewVisited = signal(false);
  public readonly rulesVisited = signal(false);
  public readonly previewJobData = signal<Record<string, unknown>>({});
  public readonly publishFocusRequest = signal(0);
  public readonly rulesCanvasFocusRequest = signal(0);
  public readonly activeSetupStep = signal<SetupStepId>("layout");

  public readonly templates = this._templates.asReadonly();
  public readonly activeTemplateId = this._activeTemplateId.asReadonly();
  public readonly rows = this._rows.asReadonly();
  public readonly dataBindings = this._dataBindings.asReadonly();
  public readonly workflowRules = this._workflowRules.asReadonly();
  public readonly selectedWorkflowRuleId = this._selectedWorkflowRuleId.asReadonly();
  public readonly focusedWorkflowNodeId = this._focusedWorkflowNodeId.asReadonly();

  public readonly activeTemplate = computed(() =>
    this._templates().find((t) => t.id === this._activeTemplateId())
  );

  public readonly isReadonly = computed(
    () => this.activeTemplate()?.status === "published"
  );

  public readonly selectedField = computed(() =>
    this._rows()
      .flatMap((row) => row.fields)
      .find((field) => field.id === this._selectedFieldId())
  );

  constructor() {
    this.loadState();
    this.seedDemoTemplateIfNeeded();
    if (this._templates().length === 0) {
      const template = createEmptyTemplate("General Task", "general");
      this._templates.set([template]);
      this._activeTemplateId.set(template.id);
      this.loadTemplateLayout(template);
      this.saveState();
    }
  }

  getTemplate(templateId: string): TaskTemplate | undefined {
    return this._templates().find((t) => t.id === templateId);
  }

  createTemplate(name: string, context: string) {
    this.recordUndo();
    const template = createEmptyTemplate(name, context);
    this._templates.set([...this._templates(), template]);
    this.switchTemplate(template.id, false);
    this.focusSidebarSection("fields");
  }

  setActiveSetupStep(stepId: SetupStepId) {
    this.activeSetupStep.set(stepId);
  }

  focusSidebarSection(section: BuilderSidebarSection) {
    this.sidebarFocus.set({ section, tick: Date.now() });
    this.setActiveSetupStep(setupStepFromSidebarSection(section));
  }

  requestPublishFocus() {
    this.focusSidebarSection("template");
    this.setActiveSetupStep("publish");
    this.publishFocusRequest.update((count) => count + 1);
  }

  requestRulesCanvasFocus() {
    this.focusSidebarSection("rules");
    this.rulesCanvasFocusRequest.update((count) => count + 1);
  }

  focusWorkflowRule(ruleId: string, nodeId?: string) {
    this._selectedWorkflowRuleId.set(ruleId);
    this._focusedWorkflowNodeId.set(nodeId ?? null);
    this.setActiveSetupStep("rules");
    this.rulesVisited.set(true);
    this.requestRulesCanvasFocus();
  }

  cloneTemplate(sourceId?: string) {
    this.recordUndo();
    const source =
      this.getTemplate(sourceId ?? this._activeTemplateId()) ??
      this.activeTemplate();
    if (!source) return;

    const clone = createEmptyTemplate(`${source.name} (copy)`, source.context);
    clone.layout = structuredClone(source.layout);
    clone.layout.rows = clone.layout.rows.map((row) => ({
      ...row,
      templateId: clone.id,
    }));

    this._templates.set([...this._templates(), clone]);
    this.switchTemplate(clone.id, false);
  }

  switchTemplate(templateId: string, persist = true) {
    const template = this.getTemplate(templateId);
    if (!template) return;

    this.syncActiveTemplateLayout();
    this._activeTemplateId.set(templateId);
    this.loadTemplateLayout(template);
    this.clearSelectedField();
    if (persist) {
      this.saveState();
    }
  }

  updateTemplateMeta(name: string, context: string) {
    this.assertEditable();
    const active = this.activeTemplate();
    if (!active) return;

    const contextChanged = active.context !== context;

    this.recordUndo();
    this._templates.set(
      this._templates().map((t) =>
        t.id === active.id
          ? { ...t, name: name.trim() || t.name, context, updatedAt: Date.now() }
          : t
      )
    );
    if (contextChanged) {
      this.clearSelectedField();
    }
    this.saveState();
  }

  undo() {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return;

    this.redoStack.push(this.captureState());
    this.applySnapshot(snapshot);
    this.updateUndoFlags();
  }

  redo() {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return;

    this.undoStack.push(this.captureState());
    this.applySnapshot(snapshot);
    this.updateUndoFlags();
  }

  publishTemplate(): { success: boolean; errors: string[] } {
    const active = this.activeTemplate();
    if (!active || active.status === "published") {
      return { success: false, errors: ["This template is already published."] };
    }

    this.syncActiveTemplateLayout();
    const validation = validateTemplateForPublish(
      this._rows(),
      this._dataBindings(),
      this._workflowRules()
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    this.recordUndo();
    this._templates.set(
      this._templates().map((t) =>
        t.id === active.id
          ? {
              ...t,
              status: "published" as TemplateStatus,
              version: t.version + 1,
              updatedAt: Date.now(),
            }
          : t
      )
    );
    this.saveState();
    return { success: true, errors: [] };
  }

  unpublishTemplate() {
    const active = this.activeTemplate();
    if (!active) return;

    this.recordUndo();
    this._templates.set(
      this._templates().map((t) =>
        t.id === active.id
          ? { ...t, status: "draft" as TemplateStatus, updatedAt: Date.now() }
          : t
      )
    );
    this.saveState();
  }

  deleteTemplate(templateId: string) {
    if (this._templates().length <= 1) return;

    const remaining = this._templates().filter((t) => t.id !== templateId);
    this._templates.set(remaining);

    if (this._activeTemplateId() === templateId) {
      this.switchTemplate(remaining[0].id);
    } else {
      this.saveState();
    }
  }

  private assertEditable() {
    if (this.isReadonly()) {
      throw new Error("Published templates are read-only.");
    }
  }

  addField(field: FormField, rowId: string, index?: number) {
    this.assertEditable();
    this.recordUndo();
    const templateId = this._activeTemplateId();
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
    this.saveState();
  }

  deleteField(fieldId: string, rowId: string) {
    this.assertEditable();
    this.recordUndo();
    const newRows = this._rows().map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        fields: row.fields.filter((field) => field.id !== fieldId),
      };
    });

    this._rows.set(newRows);
    this.removeFieldFromBindings(fieldId);
    if (this._selectedFieldId() === fieldId) {
      this.clearSelectedField();
    }
    this.saveState();
  }

  addRow() {
    this.assertEditable();
    this.recordUndo();
    const templateId = this._activeTemplateId();
    const newRow: FormRow = {
      id: crypto.randomUUID(),
      templateId,
      fields: [],
    };
    this._rows.set([...this._rows(), newRow]);
    this.saveState();
  }

  deleteRow(rowId: string) {
    this.assertEditable();
    this.recordUndo();
    if (this._rows().length === 1) return;

    const rowToDelete = this._rows().find((row) => row.id === rowId);
    if (rowToDelete?.fields.some((f) => f.id === this._selectedFieldId())) {
      this.clearSelectedField();
    }

    for (const field of rowToDelete?.fields ?? []) {
      this.removeFieldFromBindings(field.id);
    }

    this._rows.set(this._rows().filter((row) => row.id !== rowId));
    this.saveState();
  }

  moveField(
    fieldId: string,
    sourceRowId: string,
    targetRowId: string,
    targetIndex = -1
  ) {
    this.assertEditable();
    this.recordUndo();
    const rows = this._rows();
    let fieldToMove: FormField | undefined;
    let sourceRowIndex = -1;

    rows.forEach((row, rowIndex) => {
      if (row.id === sourceRowId) {
        sourceRowIndex = rowIndex;
        fieldToMove = row.fields.find((field) => field.id === fieldId);
      }
    });

    if (!fieldToMove) return;

    const newRows = [...rows];
    newRows[sourceRowIndex].fields = newRows[sourceRowIndex].fields.filter(
      (f) => f.id !== fieldId
    );
    const targetRowIndex = newRows.findIndex((row) => row.id === targetRowId);
    if (targetRowIndex >= 0) {
      const targetFields = [...newRows[targetRowIndex].fields];
      targetFields.splice(targetIndex, 0, fieldToMove);
      newRows[targetRowIndex].fields = targetFields;
    }
    this._rows.set(newRows);
    this.saveState();
  }

  updateField(fieldId: string, data: Partial<FormField>) {
    if (this.isReadonly()) return;

    const rows = this._rows();
    const newRows = rows.map((row) => ({
      ...row,
      fields: row.fields.map((field) =>
        field.id === fieldId ? mergeFieldUpdate(field, data) : field
      ),
    }));
    this._rows.set(newRows);
    this.saveState();
  }

  addDataBinding(binding: Omit<DataBinding, "id">): DataBinding {
    this.assertEditable();
    this.recordUndo();
    const newBinding: DataBinding = {
      id: crypto.randomUUID(),
      ...binding,
    };
    this._dataBindings.set([...this._dataBindings(), newBinding]);
    this.saveState();
    return newBinding;
  }

  updateDataBinding(bindingId: string, data: Partial<Omit<DataBinding, "id">>) {
    this.assertEditable();
    this.recordUndo();
    this._dataBindings.set(
      this._dataBindings().map((binding) =>
        binding.id === bindingId ? { ...binding, ...data } : binding
      )
    );
    this.saveState();
  }

  deleteDataBinding(bindingId: string) {
    this.assertEditable();
    this.recordUndo();
    this._dataBindings.set(
      this._dataBindings().filter((b) => b.id !== bindingId)
    );
    this.clearBindingFromFields(bindingId);
    this.saveState();
  }

  addWorkflowRule(name?: string): WorkflowRule {
    this.assertEditable();
    this.recordUndo();
    const rule = createDefaultWorkflowRule(name);
    this._workflowRules.set([...this._workflowRules(), rule]);
    this.focusWorkflowRule(rule.id);
    this.saveState();
    return rule;
  }

  updateWorkflowRule(ruleId: string, data: Partial<WorkflowRule>) {
    if (this.isReadonly()) return;
    this._workflowRules.set(
      this._workflowRules().map((rule) =>
        rule.id === ruleId ? { ...rule, ...data } : rule
      )
    );
    this.saveState();
  }

  deleteWorkflowRule(ruleId: string) {
    this.assertEditable();
    this.recordUndo();
    this._workflowRules.set(
      this._workflowRules().filter((rule) => rule.id !== ruleId)
    );
    if (this._selectedWorkflowRuleId() === ruleId) {
      const next = this._workflowRules()[0];
      this._selectedWorkflowRuleId.set(next?.id ?? null);
      this._focusedWorkflowNodeId.set(null);
    }
    this.saveState();
  }

  linkFieldToSharedList(
    fieldId: string,
    bindingId: string
  ): Observable<FetchOptionsResult> {
    this.assertEditable();
    const binding = this._dataBindings().find((item) => item.id === bindingId);
    if (!binding) {
      return of({ options: [], error: "Shared list not found." });
    }

    if (!binding.targetFieldIds.includes(fieldId)) {
      this.updateDataBinding(bindingId, {
        targetFieldIds: [...binding.targetFieldIds, fieldId],
      });
    }

    return this.refreshDataBinding(bindingId, true);
  }

  unlinkFieldFromSharedList(fieldId: string) {
    const field = this._rows()
      .flatMap((row) => row.fields)
      .find((item) => item.id === fieldId);

    if (!field?.dataBindingId) return;

    this.assertEditable();
    this.recordUndo();

    const bindingId = field.dataBindingId;
    this._dataBindings.set(
      this._dataBindings().map((binding) =>
        binding.id === bindingId
          ? {
              ...binding,
              targetFieldIds: binding.targetFieldIds.filter((id) => id !== fieldId),
            }
          : binding
      )
    );

    const rows = this._rows();
    this._rows.set(
      rows.map((row) => ({
        ...row,
        fields: row.fields.map((item) =>
          item.id === fieldId
            ? mergeFieldDataSourceUpdate(item, {
                dataBindingId: undefined,
                optionsSource: "static",
              })
            : item
        ),
      }))
    );
    this.saveState();
  }

  getSharedListForField(fieldId: string): DataBinding | undefined {
    const field = this._rows()
      .flatMap((row) => row.fields)
      .find((item) => item.id === fieldId);
    if (!field?.dataBindingId) return undefined;
    return this._dataBindings().find((binding) => binding.id === field.dataBindingId);
  }

  getFieldLabel(fieldId: string): string {
    return (
      this._rows()
        .flatMap((row) => row.fields)
        .find((field) => field.id === fieldId)?.label ?? fieldId
    );
  }

  refreshDataBinding(
    bindingId: string,
    bypassCache = false
  ): Observable<FetchOptionsResult> {
    const binding = this._dataBindings().find((item) => item.id === bindingId);
    if (!binding) {
      return of({ options: [], error: "Binding not found." });
    }

    return new Observable((subscriber) => {
      this.dataSourceService
        .fetchOptions(binding.dataSource, bypassCache)
        .subscribe({
          next: (result) => {
            if (!result.error) {
              this.applyBindingOptions(binding, result.options);
            }
            subscriber.next(result);
            subscriber.complete();
          },
          error: (err) => {
            subscriber.next({
              options: [],
              error: err?.message ?? "Failed to refresh binding.",
            });
            subscriber.complete();
          },
        });
    });
  }

  private applyBindingOptions(binding: DataBinding, options: RadioOption[]) {
    const rows = this._rows();
    const newRows = rows.map((row) => ({
      ...row,
      fields: row.fields.map((field) =>
        binding.targetFieldIds.includes(field.id)
          ? mergeFieldDataSourceUpdate(field, {
              optionsSource: "api",
              dataSource: binding.dataSource,
              dataCatalogId: binding.dataCatalogId,
              dataBindingId: binding.id,
              options,
            })
          : field
      ),
    }));
    this._rows.set(newRows);
    this.saveState();
  }

  private removeFieldFromBindings(fieldId: string) {
    const updatedBindings = this._dataBindings()
      .map((binding) => ({
        ...binding,
        targetFieldIds: binding.targetFieldIds.filter((id) => id !== fieldId),
      }))
      .filter((binding) => binding.targetFieldIds.length > 0);

    this._dataBindings.set(updatedBindings);
  }

  private clearBindingFromFields(bindingId: string) {
    const rows = this._rows();
    const newRows = rows.map((row) => ({
      ...row,
      fields: row.fields.map((field) =>
        field.dataBindingId === bindingId
          ? mergeFieldDataSourceUpdate(field, {
              dataBindingId: undefined,
              optionsSource: "static",
            })
          : field
      ),
    }));
    this._rows.set(newRows);
  }

  setSelectedField(fieldId: string) {
    this._selectedFieldId.set(fieldId);
  }

  clearSelectedField() {
    this._selectedFieldId.set(null);
  }

  findRowByFieldId(fieldId: string): FormRow | undefined {
    return this._rows().find((row) =>
      row.fields.some((field) => field.id === fieldId)
    );
  }

  moveRowUp(rowId: string) {
    this.assertEditable();
    this.recordUndo();
    const rows = [...this._rows()];
    const index = rows.findIndex((row) => row.id === rowId);
    if (index > 0) {
      [rows[index], rows[index - 1]] = [rows[index - 1], rows[index]];
      this._rows.set(rows);
      this.saveState();
    }
  }

  moveRowDown(rowId: string) {
    this.assertEditable();
    this.recordUndo();
    const rows = [...this._rows()];
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < rows.length - 1) {
      [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
      this._rows.set(rows);
      this.saveState();
    }
  }

  private syncActiveTemplateLayout() {
    const activeId = this._activeTemplateId();
    if (!activeId) return;

    this._templates.set(
      this._templates().map((t) =>
        t.id === activeId
          ? {
              ...t,
              layout: {
                rows: this._rows(),
                dataBindings: this._dataBindings(),
                workflowRules: this._workflowRules(),
              },
              updatedAt: Date.now(),
            }
          : t
      )
    );
  }

  private captureState(): PersistedState {
    this.syncActiveTemplateLayout();
    return {
      templates: structuredClone(this._templates()),
      activeTemplateId: this._activeTemplateId(),
      timestamp: Date.now(),
    };
  }

  private recordUndo() {
    if (this.isReadonly()) return;
    this.undoStack.push(this.captureState());
    if (this.undoStack.length > this.maxUndo) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoFlags();
  }

  private applySnapshot(snapshot: PersistedState) {
    this._templates.set(structuredClone(snapshot.templates));
    this._activeTemplateId.set(snapshot.activeTemplateId);
    const active = this.getTemplate(snapshot.activeTemplateId);
    if (active) {
      this.loadTemplateLayout(active);
    }
    this.clearSelectedField();
    this.saveState();
  }

  private updateUndoFlags() {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  private loadTemplateLayout(template: TaskTemplate) {
    const migrated = migrateLegacyVisibilityRules(
      structuredClone(template.layout.rows),
      structuredClone(template.layout.workflowRules ?? [])
    );

    this._rows.set(migrated.rows);
    this._dataBindings.set(structuredClone(template.layout.dataBindings));
    this._workflowRules.set(migrated.rules);
    this._selectedWorkflowRuleId.set(null);
    this._focusedWorkflowNodeId.set(null);
    this.pruneOrphanedDataBindings();

    if (migrated.changed) {
      this.syncActiveTemplateLayout();
      this.saveState();
    }
  }

  private pruneOrphanedDataBindings() {
    const fieldIds = new Set(
      this._rows().flatMap((row) => row.fields.map((field) => field.id))
    );

    this._dataBindings.set(
      this._dataBindings()
        .map((binding) => ({
          ...binding,
          targetFieldIds: binding.targetFieldIds.filter((id) => fieldIds.has(id)),
        }))
        .filter((binding) => binding.targetFieldIds.length > 0)
    );
  }

  private saveState() {
    try {
      this.pruneOrphanedDataBindings();
      this.syncActiveTemplateLayout();
      const state: PersistedState = {
        templates: this._templates(),
        activeTemplateId: this._activeTemplateId(),
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as PersistedState;
        this._templates.set(state.templates ?? []);
        this._activeTemplateId.set(state.activeTemplateId);
        const active = this.getTemplate(state.activeTemplateId);
        if (active) {
          this.loadTemplateLayout(active);
        }
        return;
      }

      this.migrateLegacyState();
    } catch (error) {
      console.error("Failed to load state:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private migrateLegacyState() {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;

    try {
      const legacyState = JSON.parse(legacy);
      const template = createEmptyTemplate("General Task", "general");
      template.layout.rows = (legacyState.rows ?? []).map((row: FormRow) => ({
        ...row,
        templateId: template.id,
        formId: undefined,
      }));
      template.layout.dataBindings = legacyState.dataBindings ?? [];

      this._templates.set([template]);
      this._activeTemplateId.set(template.id);
      this.loadTemplateLayout(template);
      this.saveState();
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  private seedDemoTemplateIfNeeded() {
    if (localStorage.getItem(DEMO_TEMPLATE_SEED_KEY)) return;

    const withoutLegacyDemo = this._templates().filter(
      (t) =>
        t.name !== 'Digital Advertising Task' &&
        t.name !== 'New Task (Advertising)'
    );

    const demo = createNewTaskDemoTemplate();
    this._templates.set([...withoutLegacyDemo, demo]);
    localStorage.setItem(DEMO_TEMPLATE_SEED_KEY, '1');
    localStorage.removeItem('ui-builder-demo-seeded-v1');
    this.saveState();
  }

  exportForm() {
    const active = this.activeTemplate();
    const code = this.generateForm();
    const blob = new Blob([code], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active?.name ?? "form"}-v${active?.version ?? 1}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  generateForm() {
    const rows = this._rows();
    const apiFields = this.getApiFields(rows);
    const template = this.generateTemplate(rows, apiFields.length > 0);
    let code = this.generateImports(apiFields.length > 0);
    code += this.generateComponentDecorator(template, apiFields.length > 0);
    code += this.generateFormBody(rows, apiFields);
    return code;
  }

  private getApiFields(rows: FormRow[]): FormField[] {
    return rows
      .flatMap((row) => row.fields)
      .filter((field) => field.optionsSource === "api" && field.dataSource?.url);
  }

  private sanitizeFieldKey(fieldId: string): string {
    return fieldId.replace(/-/g, "_");
  }

  private generateImports(hasApiFields: boolean): string {
    let code =
      `import { Component, OnInit, signal } from '@angular/core';\n` +
      `import { CommonModule } from '@angular/common';\n`;

    if (hasApiFields) {
      code += `import { HttpClient, provideHttpClient } from '@angular/common/http';\n`;
    }

    return `${code}\n`;
  }

  private generateComponentDecorator(
    template: string,
    hasApiFields: boolean
  ): string {
    const providers = hasApiFields
      ? `,\n  providers: [provideHttpClient()]`
      : "";
    return (
      `@Component({\n` +
      `  selector: 'app-generated-form',\n` +
      `  standalone: true,\n` +
      `  imports: [CommonModule]${providers},\n` +
      `  template: \`${template}\`\n` +
      `})\n`
    );
  }

  private getInitialFieldValue(field: FormField): string {
    if (field.type === "checkbox") {
      return "false";
    }
    if (field.type === "cost-breakdown") {
      const pct = field.managementFeePercent ?? 15;
      return `{ grossBudget: '', managementFeePercent: ${pct}, additionalFees: [] }`;
    }
    if (field.type === "section-header") {
      return "null";
    }
    return "''";
  }

  private bindInput(fieldId: string, type: string, placeholder: string): string {
    return (
      `[value]="jobData()['${fieldId}'] ?? ''" ` +
      `(input)="updateField('${fieldId}', $any($event.target).value)" ` +
      `id="${fieldId}" type="${type}" placeholder="${placeholder}" class="w-full p-2 border rounded shadow-sm"`
    );
  }

  private generateFormBody(rows: FormRow[], apiFields: FormField[]): string {
    const allFields = rows.flatMap((row) => row.fields);
    const requiredFields = allFields.filter((f) => f.required);

    let code = `export class GeneratedForm implements OnInit {\n`;
    code += `  jobData = signal<Record<string, unknown>>({\n`;

    for (const field of allFields) {
      if (field.type === "section-header") continue;
      code += `    '${field.id}': ${this.getInitialFieldValue(field)},\n`;
    }

    code += `  });\n\n`;
    code += `  validationErrors = signal<string[]>([]);\n`;

    for (const field of apiFields) {
      const key = this.sanitizeFieldKey(field.id);
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
      if (field.type === "section-header") continue;
      const label = field.label.replace(/'/g, "\\'");
      if (field.type === "cost-breakdown") {
        code += `    const ${this.sanitizeFieldKey(field.id)}Val = data['${field.id}'] as { grossBudget?: unknown } | undefined;\n`;
        code += `    if (!${this.sanitizeFieldKey(field.id)}Val?.grossBudget) errors.push('${label}: gross budget is required');\n`;
        continue;
      }
      code += `    if (data['${field.id}'] === '' || data['${field.id}'] === null || data['${field.id}'] === undefined`;
      if (field.type === "checkbox") {
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
      const key = this.sanitizeFieldKey(field.id);
      const source = field.dataSource!;
      const method = source.method ?? "GET";
      const responsePath = source.responsePath ?? "";
      const params = source.params ?? {};
      const labelExpr = nestedValueToExportExpression("item", source.labelKey);
      const valueExpr = nestedValueToExportExpression("item", source.valueKey);

      if (method === "POST") {
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
      code += `          label: String(${labelExpr.replace(/item/g, "record")} ?? ''),\n`;
      code += `          value: String(${valueExpr.replace(/item/g, "record")} ?? ''),\n`;
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

  private generateTemplate(rows: FormRow[], hasApiFields: boolean): string {
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
        if (field.type === "section-header") {
          template += `      <div class="basis-full pt-2 pb-1">\n`;
          template += `        <h3 class="text-xs font-bold tracking-wide uppercase text-gray-500 border-t border-gray-200 pt-4">${field.label}</h3>\n`;
          if (field.hint) {
            template += `        <p class="text-xs text-gray-400 mt-1">${field.hint}</p>\n`;
          }
          template += `      </div>\n`;
          continue;
        }

        const hintHtml = field.hint
          ? `        <p class="text-xs text-gray-500 mb-1">${field.hint}</p>\n`
          : "";

        template += `      <div class="flex-1">\n`;
        if (field.type !== "cost-breakdown") {
          template += `        <label class="block text-sm font-medium mb-1" for="${field.id}">${field.label}${field.required ? " *" : ""}</label>\n`;
          template += hintHtml;
        }

        if (field.type === "text") {
          const inputType =
            field.inputType === "currency" ? "number" : field.inputType || "text";
          template += `        <input ${this.bindInput(field.id, inputType, field.placeholder || "")}>\n`;
        } else if (field.type === "cost-breakdown") {
          template += `        <div class="border rounded p-4 bg-gray-50">\n`;
          template += `          <p class="font-medium mb-2">${field.label}</p>\n`;
          if (field.hint) template += `          <p class="text-xs text-gray-500 mb-3">${field.hint}</p>\n`;
          template += `          <p class="text-sm text-gray-600">Cost breakdown block — use runtime component in app.</p>\n`;
          template += `        </div>\n`;
        } else if (field.type === "radio") {
          template += `        <div class="flex flex-col gap-2">\n`;
          if (field.optionsSource === "api" && hasApiFields) {
            const key = this.sanitizeFieldKey(field.id);
            template += `          @for (option of ${key}Options(); track option.value) {\n`;
            template += `            <label class="flex items-center gap-2">\n`;
            template += `              <input type="radio" name="${field.id}" [checked]="jobData()['${field.id}'] === option.value" (change)="updateField('${field.id}', option.value)"> {{ option.label }}\n`;
            template += `            </label>\n`;
            template += `          }\n`;
          } else {
            for (const option of field.options || []) {
              template += `          <label class="flex items-center gap-2">\n`;
              template += `            <input type="radio" name="${field.id}" [checked]="jobData()['${field.id}'] === '${option.value}'" (change)="updateField('${field.id}', '${option.value}')"> ${option.label}\n`;
              template += `          </label>\n`;
            }
          }
          template += `        </div>\n`;
        } else if (field.type === "checkbox") {
          template += `        <input type="checkbox" id="${field.id}" [checked]="!!jobData()['${field.id}']" (change)="updateField('${field.id}', $any($event.target).checked)" class="h-5 w-5">\n`;
        } else if (field.type === "dropdown") {
          template += `        <select id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (change)="updateField('${field.id}', $any($event.target).value)" class="w-full p-2 border rounded shadow-sm">\n`;
          template += `          <option value="" disabled>${field.placeholder || "Select an option"}</option>\n`;
          if (field.optionsSource === "api" && hasApiFields) {
            const key = this.sanitizeFieldKey(field.id);
            template += `          @for (option of ${key}Options(); track option.value) {\n`;
            template += `            <option [value]="option.value">{{ option.label }}</option>\n`;
            template += `          }\n`;
          } else {
            for (const option of field.options || []) {
              template += `          <option value="${option.value}">${option.label}</option>\n`;
            }
          }
          template += `        </select>\n`;
        } else if (field.type === "textarea") {
          template += `        <textarea id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (input)="updateField('${field.id}', $any($event.target).value)" placeholder="${field.placeholder || ""}" class="w-full p-2 border rounded shadow-sm"></textarea>\n`;
        } else if (field.type === "datepicker") {
          template += `        <input type="date" id="${field.id}" [value]="jobData()['${field.id}'] ?? ''" (input)="updateField('${field.id}', $any($event.target).value)" class="w-full p-2 border rounded shadow-sm">\n`;
        } else {
          template += `        <input ${this.bindInput(field.id, "text", field.placeholder || "")}>\n`;
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
}
