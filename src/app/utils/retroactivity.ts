import { FormField } from '../models/field';
import { FormRow } from '../models/form';
import {
  RiskPolicy,
  TaskTemplate,
  TaskTemplateLayout,
  TemplateVersionSnapshot,
} from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { JobSubmission, normalizeTaskStatus } from '../models/job-submission';

export type FieldChangeClass = 'COSMETIC' | 'ADDITIVE' | 'STRUCTURAL' | 'BREAKING';
export type RuleChangeClass = 'SAFE' | 'BREAKING';

const COSMETIC_KEYS = ['label', 'hint', 'placeholder'] as const;

export type FieldEventPatch =
  | { kind: 'upsert'; changes: Partial<FormField> }
  | { kind: 'add'; field: FormField; rowId: string }
  | { kind: 'remove' };

export interface FieldDiffEvent {
  id: string;
  fieldId: string;
  fromVersion: number;
  toVersion: number;
  class: FieldChangeClass;
  patch: FieldEventPatch;
}

export interface RuleDiffEvent {
  id: string;
  fromVersion: number;
  toVersion: number;
  class: RuleChangeClass;
}

export interface PublishDiff {
  fieldEvents: FieldDiffEvent[];
  ruleEvent: RuleDiffEvent | null;
}

export type DiffPublishResult =
  | { ok: true; diff: PublishDiff; retiredFieldIds: string[] }
  | { ok: false; error: 'FIELD_ID_REUSED'; fieldId: string };

export interface JobMigrationState {
  templateVersion?: number;
  appliedFieldEventIds?: string[];
  appliedRuleEventIds?: string[];
}

type RestrictedField = FormField & { restricted?: boolean };

function nextId(factory?: () => string): string {
  return factory?.() ?? crypto.randomUUID();
}

function isRestricted(field: FormField): field is RestrictedField {
  return Boolean((field as RestrictedField).restricted);
}

function cloneLayout(layout: TaskTemplateLayout): TaskTemplateLayout {
  return structuredClone(layout);
}

export function getAllLayoutFields(layout: TaskTemplateLayout): FormField[] {
  return layout.rows.flatMap((row) => row.fields);
}

function fieldById(layout: TaskTemplateLayout): Map<string, FormField> {
  const map = new Map<string, FormField>();
  for (const field of getAllLayoutFields(layout)) {
    map.set(field.id, field);
  }
  return map;
}

function rowIdForField(layout: TaskTemplateLayout, fieldId: string): string {
  return layout.rows.find((row) => row.fields.some((field) => field.id === fieldId))?.id ?? '';
}

export function referencedFieldIds(rules: WorkflowRule[]): Set<string> {
  const ids = new Set<string>();
  for (const rule of rules) {
    for (const node of rule.nodes) {
      if (node.data.fieldId) ids.add(node.data.fieldId);
      if (node.data.targetFieldId) ids.add(node.data.targetFieldId);
    }
  }
  return ids;
}

function cosmeticChanges(prev: FormField, next: FormField): Partial<FormField> {
  const changes: Partial<FormField> = {};
  for (const key of COSMETIC_KEYS) {
    if (prev[key] !== next[key]) {
      (changes as Record<string, unknown>)[key] = next[key];
    }
  }
  return changes;
}

function hasCosmeticChange(prev: FormField, next: FormField): boolean {
  return COSMETIC_KEYS.some((key) => prev[key] !== next[key]);
}

function coreSignature(field: FormField): string {
  const { label, hint, placeholder, ...rest } = field;
  return JSON.stringify(rest);
}

function rulesSignature(rules: WorkflowRule[]): string {
  return JSON.stringify(rules);
}

function ruleMap(rules: WorkflowRule[]): Map<string, WorkflowRule> {
  return new Map(rules.map((rule) => [rule.id, rule]));
}

function classifyExistingField(
  prev: FormField,
  next: FormField
): FieldChangeClass | null {
  const restrictedChanged = isRestricted(prev) !== isRestricted(next);
  const cosmetic = hasCosmeticChange(prev, next);
  const coreChanged = coreSignature(prev) !== coreSignature(next);

  if (restrictedChanged) return 'BREAKING';
  if (coreChanged) return 'STRUCTURAL';
  if (cosmetic) return 'COSMETIC';
  return null;
}

function classifyRules(prev: WorkflowRule[], next: WorkflowRule[]): RuleChangeClass | null {
  const prevMap = ruleMap(prev);
  const nextMap = ruleMap(next);

  let addedOnly = true;
  let anyChange = false;

  for (const [id, prevRule] of prevMap) {
    const nextRule = nextMap.get(id);
    if (!nextRule) {
      anyChange = true;
      addedOnly = false;
      continue;
    }
    if (rulesSignature([prevRule]) !== rulesSignature([nextRule])) {
      anyChange = true;
      addedOnly = false;
    }
  }

  for (const id of nextMap.keys()) {
    if (!prevMap.has(id)) {
      anyChange = true;
    }
  }

  if (!anyChange) return null;
  return addedOnly ? 'SAFE' : 'BREAKING';
}

function makeFieldEvent(
  fieldId: string,
  fromVersion: number,
  toVersion: number,
  className: FieldChangeClass,
  patch: FieldEventPatch,
  idFactory?: () => string
): FieldDiffEvent {
  return {
    id: nextId(idFactory),
    fieldId,
    fromVersion,
    toVersion,
    class: className,
    patch,
  };
}

function addedFieldEvents(
  prevFields: Map<string, FormField>,
  next: TaskTemplateLayout,
  nextFields: Map<string, FormField>,
  ctx: { fromVersion: number; toVersion: number; idFactory?: () => string }
): FieldDiffEvent[] {
  return [...nextFields]
    .filter(([id]) => !prevFields.has(id))
    .map(([id, field]) =>
      makeFieldEvent(id, ctx.fromVersion, ctx.toVersion, 'ADDITIVE', {
        kind: 'add',
        field: structuredClone(field),
        rowId: rowIdForField(next, id),
      }, ctx.idFactory)
    );
}

function existingFieldEvents(
  prev: TaskTemplateLayout,
  next: TaskTemplateLayout,
  prevFields: Map<string, FormField>,
  nextFields: Map<string, FormField>,
  referenced: Set<string>,
  retired: string[],
  ctx: { fromVersion: number; toVersion: number; idFactory?: () => string }
): { events: FieldDiffEvent[]; triggerRuleChange: boolean } {
  const events: FieldDiffEvent[] = [];
  let triggerRuleChange = false;

  for (const [id, prevField] of prevFields) {
    const nextField = nextFields.get(id);
    if (!nextField) {
      events.push(makeFieldEvent(id, ctx.fromVersion, ctx.toVersion, 'BREAKING', { kind: 'remove' }, ctx.idFactory));
      if (!retired.includes(id)) retired.push(id);
      continue;
    }

    const changeClass = classifyExistingField(prevField, nextField);
    if (!changeClass) continue;
    if (changeClass === 'COSMETIC' && referenced.has(id)) {
      triggerRuleChange = true;
      continue;
    }
    const changes = changeClass === 'COSMETIC'
      ? cosmeticChanges(prevField, nextField)
      : ({ ...nextField } satisfies Partial<FormField>);
    events.push(makeFieldEvent(id, ctx.fromVersion, ctx.toVersion, changeClass, { kind: 'upsert', changes }, ctx.idFactory));
  }
  return { events, triggerRuleChange };
}

export function diffPublish(
  prev: TaskTemplateLayout | null,
  next: TaskTemplateLayout,
  ctx: {
    fromVersion: number;
    toVersion: number;
    retiredFieldIds?: string[];
    idFactory?: () => string;
  }
): DiffPublishResult {
  const retired = [...(ctx.retiredFieldIds ?? [])];
  const nextRules = next.workflowRules ?? [];
  const prevRules = prev?.workflowRules ?? [];
  const referenced = referencedFieldIds([...prevRules, ...nextRules]);

  if (!prev) {
    return {
      ok: true,
      diff: { fieldEvents: [], ruleEvent: null },
      retiredFieldIds: retired,
    };
  }

  const prevFields = fieldById(prev);
  const nextFields = fieldById(next);

  for (const id of nextFields.keys()) {
    if (!prevFields.has(id) && retired.includes(id)) {
      return { ok: false, error: 'FIELD_ID_REUSED', fieldId: id };
    }
  }

  const fieldEvents = addedFieldEvents(prevFields, next, nextFields, ctx);
  const existing = existingFieldEvents(prev, next, prevFields, nextFields, referenced, retired, ctx);
  fieldEvents.push(...existing.events);

  let ruleClass = classifyRules(prevRules, nextRules);
  if (existing.triggerRuleChange) {
    ruleClass = 'BREAKING';
  }

  const ruleEvent: RuleDiffEvent | null = ruleClass
    ? {
        id: nextId(ctx.idFactory),
        fromVersion: ctx.fromVersion,
        toVersion: ctx.toVersion,
        class: ruleClass,
      }
    : null;

  return {
    ok: true,
    diff: { fieldEvents, ruleEvent },
    retiredFieldIds: [...retired],
  };
}

export function layoutEventAutoApplies(
  event: FieldDiffEvent,
  policy: RiskPolicy
): boolean {
  if (policy === 'NONE') return false;
  if (event.class === 'BREAKING' || event.class === 'STRUCTURAL') return false;
  if (event.class === 'COSMETIC') return policy === 'COSMETIC' || policy === 'ADDITIVE';
  if (event.class === 'ADDITIVE') return policy === 'ADDITIVE';
  return false;
}

export function behaviorEventAutoApplies(
  event: RuleDiffEvent,
  policy: RiskPolicy
): boolean {
  return event.class === 'SAFE' && policy !== 'NONE';
}

function pinOf(job: JobMigrationState): number {
  return job.templateVersion ?? 0;
}

export function applyLayoutEvents<T extends JobMigrationState>(
  job: T,
  events: FieldDiffEvent[]
): T {
  const applied = [...(job.appliedFieldEventIds ?? [])];
  for (const event of events) {
    if (applied.includes(event.id)) continue;
    applied.push(event.id);
  }
  if (applied.length === (job.appliedFieldEventIds ?? []).length) return job;
  return { ...job, appliedFieldEventIds: applied };
}

export function applyBehaviorEvent<T extends JobMigrationState>(
  job: T,
  event: RuleDiffEvent
): T {
  if (pinOf(job) !== event.fromVersion) return job;
  const applied = job.appliedRuleEventIds ?? [];
  if (applied.includes(event.id)) return job;
  return {
    ...job,
    templateVersion: event.toVersion,
    appliedRuleEventIds: [...applied, event.id],
  };
}

export function autoApplyOnPublish<T extends JobMigrationState>(
  job: T,
  diff: PublishDiff,
  policy: RiskPolicy
): T {
  const layoutEvents = diff.fieldEvents.filter((event) =>
    layoutEventAutoApplies(event, policy)
  );
  let next = applyLayoutEvents(job, layoutEvents);
  if (
    diff.ruleEvent &&
    behaviorEventAutoApplies(diff.ruleEvent, policy) &&
    pinOf(next) === diff.ruleEvent.fromVersion
  ) {
    next = applyBehaviorEvent(next, diff.ruleEvent);
  }
  return next;
}

export function migrateJob<T extends JobMigrationState>(
  job: T,
  fieldEvents: FieldDiffEvent[],
  ruleEvents: RuleDiffEvent[]
): T {
  const pin = pinOf(job);
  const pendingFields = fieldEvents.filter(
    (event) =>
      event.fromVersion >= pin && !(job.appliedFieldEventIds ?? []).includes(event.id)
  );
  let next = applyLayoutEvents(job, pendingFields);
  const nextRule = ruleEvents.find((event) => event.fromVersion === pin);
  if (nextRule) {
    next = applyBehaviorEvent(next, nextRule);
  }
  return next;
}

/** Apply migrate steps until the job has no pending layout/behavior events. */
export function migrateJobFully<T extends JobMigrationState>(
  job: T,
  fieldEvents: FieldDiffEvent[],
  ruleEvents: RuleDiffEvent[],
  maxSteps = 50
): T {
  let next = job;
  for (let i = 0; i < maxSteps; i++) {
    if (!canMigrateJob(next, fieldEvents, ruleEvents)) return next;
    const stepped = migrateJob(next, fieldEvents, ruleEvents);
    if (
      pinOf(stepped) === pinOf(next) &&
      (stepped.appliedFieldEventIds?.length ?? 0) === (next.appliedFieldEventIds?.length ?? 0) &&
      (stepped.appliedRuleEventIds?.length ?? 0) === (next.appliedRuleEventIds?.length ?? 0)
    ) {
      return next;
    }
    next = stepped;
  }
  return next;
}

export function unapplyLayoutEvent<T extends JobMigrationState>(
  job: T,
  eventId: string
): T {
  const applied = (job.appliedFieldEventIds ?? []).filter((id) => id !== eventId);
  return { ...job, appliedFieldEventIds: applied };
}

function applyPatchToLayout(layout: TaskTemplateLayout, event: FieldDiffEvent): void {
  const patch = event.patch;
  if (patch.kind === 'add') {
    if (getAllLayoutFields(layout).some((field) => field.id === event.fieldId)) return;
    const row = layout.rows.find((item) => item.id === patch.rowId) ?? layout.rows[0];
    if (!row) {
      const created: FormRow = {
        id: patch.rowId || crypto.randomUUID(),
        templateId: '',
        fields: [structuredClone(patch.field)],
      };
      layout.rows.push(created);
      return;
    }
    row.fields = [...row.fields, structuredClone(patch.field)];
    return;
  }

  if (patch.kind === 'remove') {
    for (const row of layout.rows) {
      row.fields = row.fields.filter((field) => field.id !== event.fieldId);
    }
    return;
  }

  for (const row of layout.rows) {
    row.fields = row.fields.map((field) =>
      field.id === event.fieldId ? { ...field, ...patch.changes } : field
    );
  }
}

export function findSnapshotForPin(
  snapshots: TemplateVersionSnapshot[],
  pin: number
): TemplateVersionSnapshot | undefined {
  const exact = snapshots.find((item) => item.version === pin);
  if (exact) return exact;
  if (pin <= 0) return snapshots[0];
  return (
    snapshots
      .filter((item) => item.version <= pin)
      .sort((a, b) => b.version - a.version)[0] ?? snapshots[0]
  );
}

export function resolveLayout(
  snapshots: TemplateVersionSnapshot[],
  pin: number,
  fieldEvents: FieldDiffEvent[],
  appliedFieldEventIds: string[] = []
): TaskTemplateLayout {
  const snapshot = findSnapshotForPin(snapshots, pin);
  if (!snapshot) {
    throw new Error(`No snapshot for pin ${pin}`);
  }

  const layout = cloneLayout(snapshot.layout);
  const applied = new Set(appliedFieldEventIds);
  const replay = fieldEvents
    .filter((event) => event.fromVersion >= pin && applied.has(event.id))
    .sort((a, b) => a.toVersion - b.toVersion || a.id.localeCompare(b.id));

  for (const event of replay) {
    applyPatchToLayout(layout, event);
  }
  return layout;
}

export function latestSnapshotVersion(template: Pick<TaskTemplate, 'versions'>): number {
  const versions = template.versions ?? [];
  if (!versions.length) return 0;
  return Math.max(...versions.map((item) => item.version));
}

export function lastPublishedLayout(template: TaskTemplate): TaskTemplateLayout {
  const versions = template.versions ?? [];
  if (!versions.length) return template.layout;
  return versions.at(-1)!.layout;
}

export function lastPublishedVersion(template: TaskTemplate): number {
  const fromSnapshots = latestSnapshotVersion(template);
  if (fromSnapshots > 0) return fromSnapshots;
  // Published templates always have a version ≥ 1 after a successful publish.
  if (template.status === 'published') {
    return template.version > 0 ? template.version : 1;
  }
  return Math.max(template.version, 0);
}

export function canMigrateJob(
  job: JobMigrationState,
  fieldEvents: FieldDiffEvent[],
  ruleEvents: RuleDiffEvent[]
): boolean {
  const pin = pinOf(job);
  const pendingFields = fieldEvents.some(
    (event) =>
      event.fromVersion >= pin && !(job.appliedFieldEventIds ?? []).includes(event.id)
  );
  const nextRule = ruleEvents.some((event) => event.fromVersion === pin);
  return pendingFields || nextRule;
}

export function normalizeJob(job: JobSubmission): JobSubmission {
  return {
    ...job,
    status: normalizeTaskStatus(job.status),
    appliedFieldEventIds: job.appliedFieldEventIds ?? [],
    appliedRuleEventIds: job.appliedRuleEventIds ?? [],
  };
}

export function normalizeTemplate(template: TaskTemplate): TaskTemplate {
  const versions = template.versions ?? [];
  const withSnapshot =
    template.status === 'published' && versions.length === 0
      ? [
          {
            version: template.version || 1,
            layout: structuredClone(template.layout),
          },
        ]
      : versions;

  return {
    ...template,
    versions: withSnapshot,
    retiredFieldIds: template.retiredFieldIds ?? [],
    riskPolicy: template.riskPolicy ?? 'ADDITIVE',
  };
}
