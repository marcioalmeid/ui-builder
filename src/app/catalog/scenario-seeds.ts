import { FormField } from '../models/field';
import { JobSubmission } from '../models/job-submission';
import {
  RiskPolicy,
  TaskTemplate,
  TaskTemplateLayout,
} from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { createAdvertisingFixture } from './demo-templates';
import { createShowFieldsWorkflowRule } from '../utils/workflow-migration';
import {
  autoApplyOnPublish,
  diffPublish,
  FieldDiffEvent,
  latestSnapshotVersion,
  migrateJob,
  resolveLayout,
  RuleDiffEvent,
} from '../utils/retroactivity';

export interface ScenarioPack {
  id: string;
  title: string;
  expect: string;
  action: string;
  template: TaskTemplate;
  job: JobSubmission | null;
  ledger: { fieldEvents: FieldDiffEvent[]; ruleEvents: RuleDiffEvent[] };
}

export const SCENARIO_GUIDES: Array<{ prefix: string; expect: string; action: string }> = [
  {
    prefix: '[S0]',
    expect: 'Template draft, 0 jobs. Publish freeze v1.',
    action: 'Publish, then submit a job at /run.',
  },
  {
    prefix: '[S1]',
    expect: 'Job pin 1, Title original, Vendor visível com Task type = Digital Advertising.',
    action: 'Reopen job. Depois Unpublish para testar T18 à mão, ou salta para S2.',
  },
  {
    prefix: '[S2]',
    expect: 'Title = Campaign title, pin 1, regras v1 (Vendor visível).',
    action: 'Reopen job. Vendor tem de aparecer. Pin não é 2.',
  },
  {
    prefix: '[S3]',
    expect: 'Published v3, job ainda pin 1. v2 Breaking não foi saltado.',
    action: 'Reopen job → Migrate. Pin vai para 2 (hide Vendor), não para 3.',
  },
  {
    prefix: '[S4]',
    expect: 'pin 2, regras v2 (Vendor escondido). Ainda não é v3.',
    action: 'Reopen job: Vendor oculto. Migrate outra vez → pin 3.',
  },
  {
    prefix: '[S5]',
    expect: 'pin 3 = published. Barreira respeitada (passou por v2).',
    action: 'Reopen job. Migrate não deve aparecer.',
  },
  {
    prefix: '[S6]',
    expect: 'Evento de hint existe, job ainda vê o Title sem o hint novo. pin 1.',
    action: 'Reopen job: hint antigo. Migrate aplica o hint.',
  },
  {
    prefix: '[S7]',
    expect: 'Campo Internal notes aparece no job antigo. pin continua 1.',
    action: 'Reopen job: notes vazio no formulário. Pin 1.',
  },
  {
    prefix: '[S8]',
    expect: 'Label do Task type NÃO auto-aplica. pin 1, job ainda diz Task type.',
    action: 'Reopen job: label continua Task type.',
  },
];

export function scenarioGuide(name: string) {
  return SCENARIO_GUIDES.find((item) => name.startsWith(item.prefix)) ?? null;
}

interface PublishState {
  template: TaskTemplate;
  jobs: JobSubmission[];
  fieldEvents: FieldDiffEvent[];
  ruleEvents: RuleDiffEvent[];
}

function cloneLayout(layout: TaskTemplateLayout): TaskTemplateLayout {
  return structuredClone(layout);
}

function relabel(
  layout: TaskTemplateLayout,
  fieldId: string,
  label: string
): TaskTemplateLayout {
  const next = cloneLayout(layout);
  for (const row of next.rows) {
    row.fields = row.fields.map((field) =>
      field.id === fieldId ? { ...field, label } : field
    );
  }
  return next;
}

function setHint(
  layout: TaskTemplateLayout,
  fieldId: string,
  hint: string
): TaskTemplateLayout {
  const next = cloneLayout(layout);
  for (const row of next.rows) {
    row.fields = row.fields.map((field) =>
      field.id === fieldId ? { ...field, hint } : field
    );
  }
  return next;
}

function hideVendor(layout: TaskTemplateLayout, vendorId: string): TaskTemplateLayout {
  const next = cloneLayout(layout);
  for (const rule of next.workflowRules ?? []) {
    rule.nodes = rule.nodes.map((node) =>
      node.type === 'action-show' && node.data.targetFieldId === vendorId
        ? { ...node, type: 'action-hide' as const }
        : node
    );
  }
  return next;
}

function addSafePrintRule(
  layout: TaskTemplateLayout,
  taskTypeId: string,
  platformId: string
): TaskTemplateLayout {
  const next = cloneLayout(layout);
  const extra: WorkflowRule = createShowFieldsWorkflowRule(
    'Show Platform when Task type is Print Media',
    taskTypeId,
    'equals',
    'print',
    [platformId]
  );
  next.workflowRules = [...(next.workflowRules ?? []), extra];
  return next;
}

function addNotesField(layout: TaskTemplateLayout): TaskTemplateLayout {
  const next = cloneLayout(layout);
  const notes: FormField = {
    id: crypto.randomUUID(),
    type: 'textarea',
    label: 'Internal notes',
    icon: 'notes',
    required: false,
    placeholder: 'Optional notes for the operator',
    entityMapping: { catalogId: 'task-types', entityFieldKey: 'description' },
  };
  const row = next.rows[1] ?? next.rows[0];
  row.fields = [...row.fields, notes];
  return next;
}

function freezeFirstPublish(template: TaskTemplate): TaskTemplate {
  const layout = cloneLayout(template.layout);
  return {
    ...template,
    status: 'published',
    version: 1,
    riskPolicy: 'ADDITIVE',
    versions: [{ version: 1, layout }],
    updatedAt: Date.now(),
  };
}

function republish(
  state: PublishState,
  nextLayout: TaskTemplateLayout,
  policy: RiskPolicy
): PublishState {
  const fromVersion = latestSnapshotVersion(state.template);
  const toVersion = fromVersion + 1;
  const prev = state.template.versions?.at(-1)?.layout ?? null;
  const result = diffPublish(prev, nextLayout, {
    fromVersion,
    toVersion,
    retiredFieldIds: state.template.retiredFieldIds ?? [],
  });
  if (!result.ok) {
    throw new Error(`FIELD_ID_REUSED ${result.fieldId}`);
  }

  const template: TaskTemplate = {
    ...state.template,
    layout: cloneLayout(nextLayout),
    status: 'published',
    version: toVersion,
    riskPolicy: policy,
    retiredFieldIds: result.retiredFieldIds,
    versions: [
      ...(state.template.versions ?? []),
      { version: toVersion, layout: cloneLayout(nextLayout) },
    ],
    updatedAt: Date.now(),
  };

  const jobs = state.jobs.map((job) =>
    autoApplyOnPublish(job, result.diff, policy)
  );

  return {
    template,
    jobs,
    fieldEvents: [...state.fieldEvents, ...result.diff.fieldEvents],
    ruleEvents: result.diff.ruleEvent
      ? [...state.ruleEvents, result.diff.ruleEvent]
      : state.ruleEvents,
  };
}

function seedJob(
  template: TaskTemplate,
  titleId: string,
  taskTypeId: string,
  vendorId: string
): JobSubmission {
  return {
    id: `${template.id}-seed-job`,
    templateId: template.id,
    templateVersion: 1,
    templateName: template.name,
    data: {
      [titleId]: "Confirm next month's Honda budget",
      [taskTypeId]: 'digital-advertising',
      [vendorId]: 'vendor-a',
    },
    events: [],
    submittedAt: Date.now(),
    appliedFieldEventIds: [],
    appliedRuleEventIds: [],
  };
}

function forkState(state: PublishState): PublishState {
  const id = crypto.randomUUID();
  const template = { ...structuredClone(state.template), id, updatedAt: Date.now() };
  return {
    template,
    jobs: state.jobs.map((job) => ({
      ...structuredClone(job),
      id: `${id}-seed-job`,
      templateId: id,
    })),
    fieldEvents: structuredClone(state.fieldEvents),
    ruleEvents: structuredClone(state.ruleEvents),
  };
}

function pack(
  id: string,
  title: string,
  expect: string,
  action: string,
  state: PublishState,
  asDraft = false
): ScenarioPack {
  const template = asDraft
    ? { ...state.template, status: 'draft' as const, updatedAt: Date.now() }
    : state.template;
  const named = { ...template, name: title };
  const job = state.jobs[0]
    ? { ...state.jobs[0], templateId: named.id, templateName: title }
    : null;
  return {
    id,
    title,
    expect,
    action,
    template: named,
    job,
    ledger: { fieldEvents: state.fieldEvents, ruleEvents: state.ruleEvents },
  };
}

function baselineNamed(name: string): {
  fixture: ReturnType<typeof createAdvertisingFixture>;
  state: PublishState;
} {
  const fixture = createAdvertisingFixture(name);
  const template = freezeFirstPublish(fixture.template);
  const job = seedJob(template, fixture.titleId, fixture.taskTypeId, fixture.vendorId);
  return {
    fixture,
    state: {
      template,
      jobs: [job],
      fieldEvents: [],
      ruleEvents: [],
    },
  };
}

function t18From(name: string) {
  const { fixture, state } = baselineNamed(name);
  let layout = relabel(state.template.layout, fixture.titleId, 'Campaign title');
  layout = hideVendor(layout, fixture.vendorId);
  return { fixture, state: republish(state, layout, 'ADDITIVE') };
}

function barrierFrom(name: string) {
  const t18 = t18From(name);
  const layout = addSafePrintRule(
    t18.state.template.layout,
    t18.fixture.taskTypeId,
    t18.fixture.platformId
  );
  return { fixture: t18.fixture, state: republish(t18.state, layout, 'ADDITIVE') };
}

export function buildAllScenarioPacks(): ScenarioPack[] {
  const s0fixture = createAdvertisingFixture('[S0] Draft — ready to publish');
  const s0: ScenarioPack = {
    id: 's0-draft',
    title: '[S0] Draft — ready to publish',
    expect: 'Template draft, 0 jobs. Publish freeze v1.',
    action: 'Publish, then submit a job at /run.',
    template: s0fixture.template,
    job: null,
    ledger: { fieldEvents: [], ruleEvents: [] },
  };

  const s1 = baselineNamed('[S1] v1 + job pin 1');
  const s1pack = pack(
    's1-baseline',
    '[S1] v1 + job pin 1',
    'Job pin 1, Title original, Vendor visível com Task type = Digital Advertising.',
    'Reopen job. Depois Unpublish para testar T18 à mão, ou salta para S2.',
    s1.state
  );

  const s2 = t18From('[S2] T18 — label auto, pin fica');
  const s2pack = pack(
    's2-t18',
    '[S2] T18 — label auto, pin fica',
    'Title = Campaign title, pin 1, regras v1 (Vendor visível).',
    'Reopen job. Vendor tem de aparecer. Pin não é 2.',
    s2.state
  );

  const s3 = barrierFrom('[S3] Barreira — v3 SAFE, job pin 1');
  const s3pack = pack(
    's3-barrier',
    '[S3] Barreira — v3 SAFE, job pin 1',
    'Published v3, job ainda pin 1. v2 Breaking não foi saltado.',
    'Reopen job → Migrate. Pin vai para 2 (hide Vendor), não para 3.',
    s3.state
  );

  const migratedOnce = {
    fixture: s3.fixture,
    state: (() => {
      const forked = forkState(s3.state);
      return {
        ...forked,
        jobs: forked.jobs.map((job) =>
          migrateJob(job, forked.fieldEvents, forked.ruleEvents)
        ),
      };
    })(),
  };
  const s4pack = pack(
    's4-migrated-v2',
    '[S4] Depois do 1º Migrate — pin 2',
    'pin 2, regras v2 (Vendor escondido). Ainda não é v3.',
    'Reopen job: Vendor oculto. Migrate outra vez → pin 3.',
    migratedOnce.state
  );

  const migratedTwice = {
    fixture: s3.fixture,
    state: (() => {
      const forked = forkState(s3.state);
      const once = forked.jobs.map((job) =>
        migrateJob(job, forked.fieldEvents, forked.ruleEvents)
      );
      return {
        ...forked,
        jobs: once.map((job) => migrateJob(job, forked.fieldEvents, forked.ruleEvents)),
      };
    })(),
  };
  const s5pack = pack(
    's5-migrated-v3',
    '[S5] Depois do 2º Migrate — pin 3',
    'pin 3 = published. Barreira respeitada (passou por v2).',
    'Reopen job. Migrate não deve aparecer.',
    migratedTwice.state
  );

  const s6base = baselineNamed('[S6] 6a — hint não auto');
  const s6state = republish(
    s6base.state,
    setHint(s6base.state.template.layout, s6base.fixture.titleId, 'Hint from v2 (should not show yet)'),
    'NONE'
  );
  const s6pack = pack(
    's6-phase-6a',
    '[S6] 6a — hint não auto',
    'Evento de hint existe, job ainda vê o Title sem o hint novo. pin 1.',
    'Reopen job: hint antigo. Migrate aplica o hint sem (necessariamente) mudar regras.',
    s6state
  );

  const s7base = baselineNamed('[S7] 6b — campo aditivo');
  const s7state = republish(
    s7base.state,
    addNotesField(s7base.state.template.layout),
    'ADDITIVE'
  );
  const s7pack = pack(
    's7-additive',
    '[S7] 6b — campo aditivo',
    'Campo Internal notes aparece no job antigo. pin continua 1.',
    'Reopen job: notes vazio no formulário. Pin 1.',
    s7state
  );

  const s8base = baselineNamed('[S8] Trigger label → comportamento');
  const s8state = republish(
    s8base.state,
    relabel(s8base.state.template.layout, s8base.fixture.taskTypeId, 'Work type'),
    'ADDITIVE'
  );
  const s8pack = pack(
    's8-trigger',
    '[S8] Trigger label → comportamento',
    'Label do Task type NÃO auto-aplica. pin 1, job ainda diz Task type.',
    'Reopen job: label continua Task type. Dry-run desta publish foi Breaking.',
    s8state
  );

  return [s0, s1pack, s2pack, s3pack, s4pack, s5pack, s6pack, s7pack, s8pack];
}

export function effectiveJobLayout(pack: ScenarioPack): TaskTemplateLayout | null {
  if (!pack.job) return null;
  const snapshots = pack.template.versions ?? [];
  const pin = pack.job.templateVersion ?? 0;
  if (!snapshots.find((item) => item.version === pin)) return pack.template.layout;
  return resolveLayout(
    snapshots,
    pin,
    pack.ledger.fieldEvents,
    pack.job.appliedFieldEventIds ?? []
  );
}
