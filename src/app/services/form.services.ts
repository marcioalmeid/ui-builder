import { Injectable, signal, computed, inject, Injector } from "@angular/core";
import { Observable, of } from "rxjs";
import { FormRow } from "../models/form";
import { ApiDataSource, FormField, RadioOption } from "../models/field";
import { DataBinding } from "../models/data-binding";
import { WorkflowRule, createDefaultWorkflowRule } from "../models/workflow-rule";
import {
  createEmptyTemplate,
  RiskPolicy,
  TaskTemplate,
  TemplateStatus,
} from "../models/task-template";
import { ListViewConfig, MAX_LIST_COLUMNS } from "../models/list-view";
import {
  ensureListView,
  isListableField,
  normalizeListView,
  resolveTitleFieldId,
} from "../utils/layout-contract";
import { DataSourceService, FetchOptionsResult } from "./data-source.service";
import { DepartmentService } from "./department.service";
import { RetroactivityService } from "./retroactivity.service";
import { normalizeTemplate } from "../utils/retroactivity";
import { mergeFieldDataSourceUpdate, mergeFieldUpdate } from "../utils/field-data-source";
import { migrateLegacyVisibilityRules } from "../utils/workflow-migration";
import { generateAngularFormCode } from "../utils/code-generator";
import {
  getAllFields,
  setupStepFromSidebarSection,
  SetupStepId,
  validateTemplateForPublish,
} from "../utils/template-readiness";
import { JobService } from "./job.service";

export type BuilderSidebarSection = "template" | "fields" | "data" | "rules" | "list";

/** A shared list can be linked to at most one field. */
export const MAX_SHARED_LIST_FIELDS = 1;

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
  private departmentService = inject(DepartmentService);
  private retroactivity = inject(RetroactivityService);
  private injector = inject(Injector);

  private _templates = signal<TaskTemplate[]>([]);
  private _activeTemplateId = signal<string>("");
  private _rows = signal<FormRow[]>([]);
  private _dataBindings = signal<DataBinding[]>([]);
  private _workflowRules = signal<WorkflowRule[]>([]);
  private _listView = signal<ListViewConfig>({ columns: [], searchableFieldIds: [] });
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
  /** Last publishFocusRequest count that opened the confirm dialog (survives remounts). */
  private publishFocusHandled = 0;
  public readonly rulesCanvasFocusRequest = signal(0);
  public readonly activeSetupStep = signal<SetupStepId>("layout");

  public readonly templates = this._templates.asReadonly();
  public readonly activeTemplateId = this._activeTemplateId.asReadonly();
  public readonly rows = this._rows.asReadonly();
  public readonly dataBindings = this._dataBindings.asReadonly();
  public readonly workflowRules = this._workflowRules.asReadonly();
  public readonly listView = this._listView.asReadonly();
  public readonly selectedWorkflowRuleId = this._selectedWorkflowRuleId.asReadonly();
  public readonly focusedWorkflowNodeId = this._focusedWorkflowNodeId.asReadonly();

  public readonly activeTemplate = computed(() =>
    this._templates().find((t) => t.id === this._activeTemplateId())
  );

  /** Returns the departments for the active template, or empty array. */
  public readonly activeTemplateDepartments = computed<string[]>(
    () => this.activeTemplate()?.departments ?? []
  );

  /** Global list of valid departments from the API. */
  public readonly availableDepartments = computed<string[]>(
    () => this.departmentService.departments()
  );

  public readonly isReadonly = computed(
    () => this.activeTemplate()?.status === "published"
  );

  public readonly selectedField = computed(() =>
    this.fieldIndex().get(this._selectedFieldId() ?? '')
  );

  private readonly fieldIndex = computed(() => {
    const index = new Map<string, FormField>();
    for (const row of this._rows()) {
      for (const field of row.fields) {
        index.set(field.id, field);
      }
    }
    return index;
  });

  constructor() {
    this.loadState();
    // Load global departments from API on service initialization
    this.departmentService.loadDepartments();
    this.purgeSpikeArtifacts();

    if (this._templates().length === 0) {
      const template = createEmptyTemplate("General Task", []);
      this._templates.set([template]);
    }

    if (!this._activeTemplateId() && this._templates().length > 0) {
      this.switchTemplate(this._templates()[0].id, false);
    }
  }

  getTemplate(templateId: string): TaskTemplate | undefined {
    return this._templates().find((t) => t.id === templateId);
  }

  /** Check if any department is already used by another template. */
  isDepartmentTaken(department: string, exceptTemplateId?: string): boolean {
    return this._templates().some(
      (t) => t.id !== exceptTemplateId && (t.departments ?? []).includes(department)
    );
  }

  /** Find template that uses a specific department. */
  findTemplateByDepartment(department: string): TaskTemplate | undefined {
    return this._templates().find(
      (t) => (t.departments ?? []).includes(department)
    );
  }

  createTemplate(
    name: string,
    departments: string[] = []
  ): { success: boolean; error?: string } {
    // Validate no department conflict
    const conflicts = departments.filter((dept) => this.isDepartmentTaken(dept));
    if (conflicts.length > 0) {
      const existing = this.findTemplateByDepartment(conflicts[0]);
      return {
        success: false,
        error: `Department "${conflicts[0]}" is already used by "${existing?.name}". Only one template per department.`,
      };
    }

    this.recordUndo();
    const template = createEmptyTemplate(name, departments);
    template.departments = departments;
    this._templates.set([...this._templates(), template]);
    this.switchTemplate(template.id, false);
    this.focusSidebarSection("fields");
    return { success: true };
  }

  setActiveSetupStep(stepId: SetupStepId) {
    this.activeSetupStep.set(stepId);
  }

  focusSidebarSection(section: BuilderSidebarSection) {
    this.sidebarFocus.set({ section, tick: Date.now() });
    this.setActiveSetupStep(setupStepFromSidebarSection(section));
  }

  requestPublishFocus() {
    this.setActiveSetupStep("publish");
    this.publishFocusRequest.update((count) => count + 1);
  }

  /** True once per publishFocusRequest tick — safe across TemplateSelector remounts. */
  consumePublishFocusRequest(): boolean {
    const count = this.publishFocusRequest();
    if (count === 0 || count <= this.publishFocusHandled) {
      return false;
    }
    this.publishFocusHandled = count;
    return true;
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

  cloneTemplate(sourceId?: string): { success: boolean; error?: string } {
    const source =
      this.getTemplate(sourceId ?? this._activeTemplateId()) ??
      this.activeTemplate();
    if (!source) {
      return { success: false, error: 'No template to clone.' };
    }

    // Find a free department (not used by any other template)
    const allDepartments = this.departmentService.departments();
    const freeDepartments = allDepartments.filter(
      (dept) => !this.isDepartmentTaken(dept)
    );
    // Exclude the source's own departments so the clone gets a new one
    const sourceDeptSet = new Set(source.departments ?? []);
    const trulyFreeDepartments = freeDepartments.filter(
      (dept) => !sourceDeptSet.has(dept)
    );
    if (trulyFreeDepartments.length === 0) {
      return {
        success: false,
        error:
          'Every department already has an active template. Free a department before cloning.',
      };
    }

    // Use the first truly free department (not source's)
    const cloneDepartments = [trulyFreeDepartments[0]];

    this.recordUndo();
    const clone = createEmptyTemplate(source.name, cloneDepartments);
    clone.layout = structuredClone(source.layout);
    clone.layout.rows = clone.layout.rows.map((row) => ({
      ...row,
      templateId: clone.id,
    }));

    this._templates.set([...this._templates(), clone]);
    this.switchTemplate(clone.id, false);
    return { success: true };
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

  updateTemplateMeta(
    name: string,
    departments: string[] = []
  ): { success: boolean; error?: string } {
    this.assertEditable();
    const active = this.activeTemplate();
    if (!active) {
      return { success: false, error: 'No active template.' };
    }

    // Validate no department conflict
    const conflicts = departments.filter(
      (dept: string) => this.isDepartmentTaken(dept, active.id)
    );
    if (conflicts.length > 0) {
      const existing = this.findTemplateByDepartment(conflicts[0]);
      return {
        success: false,
        error: `Department "${conflicts[0]}" is already used by "${existing?.name}". Only one template per department.`,
      };
    }

    const departmentsChanged =
      JSON.stringify(active.departments ?? []) !== JSON.stringify(departments);

    this.recordUndo();
    this._templates.set(
      this._templates().map((t) =>
        t.id === active.id
          ? { ...t, name: name.trim() || t.name, departments, updatedAt: Date.now() }
          : t
      )
    );
    if (departmentsChanged) {
      this.clearSelectedField();
    }
    this.saveState();
    return { success: true };
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

  previewPublish() {
    this.syncActiveTemplateLayout();
    const active = this.activeTemplate();
    if (!active) {
      return {
        nextVersion: 1,
        jobCount: 0,
        diff: { fieldEvents: [], ruleEvent: null as null },
      };
    }
    return this.retroactivity.preview(active);
  }

  publishTemplate(policy?: RiskPolicy): { success: boolean; errors: string[] } {
    const active = this.activeTemplate();
    if (!active || active.status === "published") {
      return { success: false, errors: ["This template is already published."] };
    }

    this.syncActiveTemplateLayout();
    this.syncListViewFromFields(true);
    const validation = validateTemplateForPublish(
      this._rows(),
      this._dataBindings(),
      this._workflowRules()
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const riskPolicy = policy ?? active.riskPolicy ?? "ADDITIVE";
    const committed = this.retroactivity.commit(active, riskPolicy);
    if (committed.error === "FIELD_ID_REUSED") {
      return {
        success: false,
        errors: [
          `Field id "${committed.fieldId}" was retired and cannot be reused.`,
        ],
      };
    }

    this.recordUndo();
    this._templates.set(
      this._templates().map((t) => (t.id === active.id ? committed.template : t))
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

  replaceAllTemplates(templates: TaskTemplate[], activeId: string) {
    this._templates.set(templates.map(normalizeTemplate));
    this.switchTemplate(activeId, false);
    this.saveState();
  }

  updateListView(data: Partial<ListViewConfig>) {
    if (this.isReadonly()) return;
    this.recordUndo();
    const fields = getAllFields(this._rows());
    const next = normalizeListView({ ...this._listView(), ...data }, fields);
    this._listView.set(next);
    this.saveState();
  }

  setTitleFieldId(fieldId: string | undefined) {
    this.updateListView({ titleFieldId: fieldId });
  }

  toggleListColumn(fieldId: string, enabled: boolean) {
    if (this.isReadonly()) return;
    const fields = getAllFields(this._rows());
    const field = fields.find((item) => item.id === fieldId);
    if (!field || !isListableField(field)) return;

    const current = this._listView();
    const titleFieldId = resolveTitleFieldId(fields, current);
    if (fieldId === titleFieldId) return;

    let columns = [...current.columns];
    let searchableFieldIds = [...current.searchableFieldIds];

    if (enabled) {
      if (columns.some((column) => column.fieldId === fieldId)) return;
      if (columns.length >= MAX_LIST_COLUMNS) return;
      columns.push({ fieldId, filterable: true });
      if (!searchableFieldIds.includes(fieldId)) {
        searchableFieldIds.push(fieldId);
      }
    } else {
      columns = columns.filter((column) => column.fieldId !== fieldId);
    }

    this.updateListView({ columns, searchableFieldIds });
  }

  toggleSearchableField(fieldId: string, enabled: boolean) {
    if (this.isReadonly()) return;
    const fields = getAllFields(this._rows());
    const field = fields.find((item) => item.id === fieldId);
    if (!field || !isListableField(field)) return;

    const current = this._listView();
    const searchableFieldIds = enabled
      ? [...new Set([...current.searchableFieldIds, fieldId])]
      : current.searchableFieldIds.filter((id) => id !== fieldId);

    this.updateListView({ searchableFieldIds });
  }

  moveListColumn(fieldId: string, direction: 'up' | 'down') {
    if (this.isReadonly()) return;
    const columns = [...this._listView().columns];
    const index = columns.findIndex((column) => column.fieldId === fieldId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];
    this.updateListView({ columns });
  }

  syncListViewFromFields(ensureDefaults = false) {
    const fields = getAllFields(this._rows());
    const next = ensureDefaults
      ? ensureListView(this._listView(), fields)
      : normalizeListView(this._listView(), fields);

    this._listView.set(next);
    if (!this.isReadonly()) {
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
    this.syncListViewFromFields(true);
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
    this.syncListViewFromFields();
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

    const targetRowIndex = rows.findIndex((row) => row.id === targetRowId);
    if (targetRowIndex < 0) return;

    const newRows = [...rows];
    newRows[sourceRowIndex].fields = newRows[sourceRowIndex].fields.filter(
      (f) => f.id !== fieldId
    );
    const targetFields = [...newRows[targetRowIndex].fields];
    targetFields.splice(targetIndex, 0, fieldToMove);
    newRows[targetRowIndex].fields = targetFields;
    this._rows.set(newRows);
    this.saveState();
  }

  updateField(fieldId: string, data: Partial<FormField>) {
    if (this.isReadonly()) return;
    this.recordUndo();

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

  /** Binding that currently owns this field, if any. */
  getBindingOwningField(fieldId: string): DataBinding | undefined {
    const byTargets = this._dataBindings().find((binding) =>
      binding.targetFieldIds.includes(fieldId)
    );
    if (byTargets) return byTargets;

    const field = this.fieldIndex().get(fieldId);
    if (!field?.dataBindingId) return undefined;
    return this._dataBindings().find((binding) => binding.id === field.dataBindingId);
  }

  /**
   * Keep only fields not already attached to another shared list.
   * Each shared list accepts at most one field.
   * `exceptBindingId` allows the current binding to keep/replace its own target.
   */
  filterAvailableTargetFieldIds(
    fieldIds: string[],
    exceptBindingId?: string
  ): { allowed: string[]; rejected: string[] } {
    const allowed: string[] = [];
    const rejected: string[] = [];

    for (const fieldId of fieldIds) {
      const owner = this.getBindingOwningField(fieldId);
      if (owner && owner.id !== exceptBindingId) {
        rejected.push(fieldId);
        continue;
      }
      if (!allowed.includes(fieldId)) {
        allowed.push(fieldId);
      }
    }

    if (allowed.length > MAX_SHARED_LIST_FIELDS) {
      rejected.push(...allowed.slice(MAX_SHARED_LIST_FIELDS));
      return {
        allowed: allowed.slice(0, MAX_SHARED_LIST_FIELDS),
        rejected: [...new Set(rejected)],
      };
    }

    return { allowed, rejected };
  }

  addDataBinding(binding: Omit<DataBinding, "id">): DataBinding {
    this.assertEditable();
    this.recordUndo();
    const { allowed } = this.filterAvailableTargetFieldIds(binding.targetFieldIds);
    const newBinding: DataBinding = {
      id: crypto.randomUUID(),
      ...binding,
      targetFieldIds: allowed,
    };
    this._dataBindings.set([...this._dataBindings(), newBinding]);
    this.syncFieldsToBinding(newBinding);
    this.saveState();
    return newBinding;
  }

  updateDataBinding(bindingId: string, data: Partial<Omit<DataBinding, "id">>) {
    this.assertEditable();
    this.recordUndo();
    const previous = this._dataBindings().find((binding) => binding.id === bindingId);
    const nextTargets =
      data.targetFieldIds !== undefined
        ? this.filterAvailableTargetFieldIds(data.targetFieldIds, bindingId).allowed
        : undefined;

    this._dataBindings.set(
      this._dataBindings().map((binding) =>
        binding.id === bindingId
          ? {
              ...binding,
              ...data,
              ...(nextTargets !== undefined ? { targetFieldIds: nextTargets } : {}),
            }
          : binding
      )
    );

    const updated = this._dataBindings().find((binding) => binding.id === bindingId);
    if (updated && previous) {
      this.reconcileBindingFieldMembership(previous, updated);
    }
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
    this.recordUndo();
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

    const owner = this.getBindingOwningField(fieldId);
    if (owner && owner.id !== bindingId) {
      return of({
        options: [],
        error: `Field is already linked to shared list "${owner.name}". Unlink it first.`,
      });
    }

    const occupiedByOther = binding.targetFieldIds.find((id) => id !== fieldId);
    if (occupiedByOther) {
      return of({
        options: [],
        error: `Shared list already linked to "${this.getFieldLabel(occupiedByOther)}". Unlink that field first.`,
      });
    }

    if (!binding.targetFieldIds.includes(fieldId)) {
      this.updateDataBinding(bindingId, {
        targetFieldIds: [fieldId],
      });
    }

    return this.refreshDataBinding(bindingId, true);
  }

  unlinkFieldFromSharedList(fieldId: string) {
    const field = this.fieldIndex().get(fieldId);

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
    const field = this.fieldIndex().get(fieldId);
    if (!field?.dataBindingId) return undefined;
    return this._dataBindings().find((binding) => binding.id === field.dataBindingId);
  }

  getFieldLabel(fieldId: string): string {
    return this.fieldIndex().get(fieldId)?.label ?? fieldId;
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
              // Re-read binding so targetFieldIds stay current after concurrent edits.
              const latest =
                this._dataBindings().find((item) => item.id === bindingId) ?? binding;
              this.applyBindingOptions(latest, result.options);
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

  /** Attach all current target fields to this shared list (membership + catalog meta). */
  private syncFieldsToBinding(binding: DataBinding, options?: RadioOption[]) {
    const targetIds = new Set(binding.targetFieldIds);
    this._rows.set(
      this._rows().map((row) => ({
        ...row,
        fields: row.fields.map((field) => {
          if (!targetIds.has(field.id)) return field;
          return mergeFieldDataSourceUpdate(field, {
            optionsSource: "api",
            dataSource: binding.dataSource,
            dataCatalogId: binding.dataCatalogId,
            dataBindingId: binding.id,
            ...(options ? { options } : {}),
          });
        }),
      }))
    );
  }

  /** Keep field.dataBindingId in sync when a binding's target list changes. */
  private reconcileBindingFieldMembership(
    previous: DataBinding,
    next: DataBinding
  ) {
    const prevTargets = new Set(previous.targetFieldIds);
    const nextTargets = new Set(next.targetFieldIds);

    const removed = previous.targetFieldIds.filter((id) => !nextTargets.has(id));
    const addedOrKept = next.targetFieldIds;

    this._rows.set(
      this._rows().map((row) => ({
        ...row,
        fields: row.fields.map((field) => {
          if (removed.includes(field.id) && field.dataBindingId === previous.id) {
            return mergeFieldDataSourceUpdate(field, {
              dataBindingId: undefined,
              optionsSource: "static",
            });
          }
          if (addedOrKept.includes(field.id)) {
            return mergeFieldDataSourceUpdate(field, {
              optionsSource: "api",
              dataSource: next.dataSource,
              dataCatalogId: next.dataCatalogId,
              dataBindingId: next.id,
            });
          }
          // Stale membership: field points at this binding but is no longer a target.
          if (field.dataBindingId === next.id && !nextTargets.has(field.id)) {
            return mergeFieldDataSourceUpdate(field, {
              dataBindingId: undefined,
              optionsSource: "static",
            });
          }
          if (prevTargets.has(field.id) && !nextTargets.has(field.id)) {
            return field;
          }
          return field;
        }),
      }))
    );
  }

  private applyBindingOptions(binding: DataBinding, options: RadioOption[]) {
    this.syncFieldsToBinding(binding, options);
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
                listView: this._listView(),
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
    const fields = getAllFields(migrated.rows);
    this._listView.set(ensureListView(template.layout.listView, fields));
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
      // localStorage quota exceeded or private browsing — log but do not crash.
      console.warn("Failed to persist state to localStorage:", error);
    }
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as PersistedState;
        this._templates.set((state.templates ?? []).map(normalizeTemplate));
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
      const template = createEmptyTemplate("General Task", []);
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

  /**
   * Drop spike scenario templates ([S0]…[S8]) and clear their flags.
   * Does not touch data catalog sources — only seeded spike templates.
   */
  private purgeSpikeArtifacts() {
    localStorage.removeItem('ui-builder-scenarios-v1');
    localStorage.removeItem('ui-builder-scenarios-v2');

    const before = this._templates();
    const kept = before.filter((t) => !t.name.startsWith('[S'));
    if (kept.length === before.length) return;

    this._templates.set(kept);
    const activeStillThere = kept.some((t) => t.id === this._activeTemplateId());
    if (!activeStillThere) {
      this._activeTemplateId.set(kept[0]?.id ?? '');
      const active = this.getTemplate(this._activeTemplateId());
      if (active) this.loadTemplateLayout(active);
    }
    this.saveState();
    this.injector.get(JobService).pruneOrphanJobs();
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
    return generateAngularFormCode(this._rows());
  }
}
