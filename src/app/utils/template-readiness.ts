import { FormRow } from '../models/form';
import { FormField } from '../models/field';
import { DataBinding } from '../models/data-binding';
import { TaskTemplate } from '../models/task-template';
import {
  hasEntityMapping,
  isFieldBindingConfigured,
  isOptionField,
  usesApiDataSource,
} from './field-data-binding';

export { isOptionField } from './field-data-binding';

export type SetupStepId = 'template' | 'layout' | 'data' | 'rules' | 'preview' | 'publish';

export interface SetupStep {
  id: SetupStepId;
  label: string;
  complete: boolean;
  hint: string;
}

export function setupStepFromSidebarSection(
  section: 'template' | 'fields' | 'data' | 'rules'
): SetupStepId {
  const map: Record<'template' | 'fields' | 'data' | 'rules', SetupStepId> = {
    template: 'template',
    fields: 'layout',
    data: 'data',
    rules: 'rules',
  };
  return map[section];
}

export function getAllFields(rows: FormRow[]): FormField[] {
  return rows.flatMap((row) => row.fields);
}

export function isFieldDataConfigured(field: FormField): boolean {
  return isFieldBindingConfigured(field);
}

export function validateTemplateForPublish(
  rows: FormRow[],
  _dataBindings: DataBinding[] = []
): { valid: boolean; errors: string[] } {
  const fields = getAllFields(rows);
  const errors: string[] = [];

  if (fields.length === 0) {
    errors.push('Add at least one field to the template layout.');
  }

  for (const field of fields) {
    if (isFieldBindingConfigured(field)) continue;

    if (hasEntityMapping(field)) {
      errors.push(
        `"${field.label}" entity mapping is incomplete. Select an entity field.`
      );
      continue;
    }

    if (usesApiDataSource(field)) {
      errors.push(
        `"${field.label}" is set to Catalog but has no data source. Pick a catalog item or use Shared data bindings.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getFirstUnconfiguredApiField(rows: FormRow[]): FormField | undefined {
  return getAllFields(rows).find((field) => !isFieldBindingConfigured(field));
}

export function getCurrentSetupStep(steps: SetupStep[]): SetupStep | undefined {
  return steps.find((step) => !step.complete);
}

export interface SetupNextAction {
  stepId: SetupStep['id'];
  message: string;
  buttonLabel: string;
}

export function getNextSetupAction(
  steps: SetupStep[],
  rows: FormRow[],
  readyToPublish: boolean
): SetupNextAction | null {
  if (readyToPublish) {
    return {
      stepId: 'publish',
      message: 'All setup steps are complete. Publish when you are ready.',
      buttonLabel: 'Publish template',
    };
  }

  const current = getCurrentSetupStep(steps);
  if (!current) return null;

  switch (current.id) {
    case 'template':
      return {
        stepId: 'template',
        message: 'Select or create a task template to get started.',
        buttonLabel: 'Open templates',
      };
    case 'layout':
      return {
        stepId: 'layout',
        message: 'Drag task fields from the palette onto the canvas.',
        buttonLabel: 'Open fields',
      };
    case 'data': {
      const unconfigured = getAllFields(rows).filter(
        (field) => !isFieldBindingConfigured(field)
      );
      const message =
        unconfigured.length === 1
          ? `"${unconfigured[0].label}" has an incomplete data connection.`
          : `${unconfigured.length} field(s) have incomplete data connections.`;
      return {
        stepId: 'data',
        message,
        buttonLabel: 'Fix data connections',
      };
    }
    case 'rules':
      return {
        stepId: 'rules',
        message: 'Configure show/hide rules and events before preview.',
        buttonLabel: 'Open rules',
      };
    case 'preview':
      return {
        stepId: 'preview',
        message: 'Review how operators will see this form.',
        buttonLabel: 'Open preview',
      };
    default:
      return null;
  }
}

export function buildSetupSteps(
  template: TaskTemplate | undefined,
  rows: FormRow[],
  rulesVisited: boolean,
  previewVisited: boolean
): SetupStep[] {
  const fields = getAllFields(rows);
  const connectedFields = fields.filter(
    (field) => usesApiDataSource(field) || hasEntityMapping(field)
  );
  const dataComplete = fields.every(isFieldBindingConfigured);
  const workflowCount = template?.layout.workflowRules?.length ?? 0;

  const layoutComplete = fields.length > 0;
  const rulesComplete = rulesVisited && layoutComplete;
  const previewComplete = previewVisited && layoutComplete;
  const publishComplete = template?.status === 'published';

  return [
    {
      id: 'template',
      label: 'Template',
      complete: Boolean(template?.name),
      hint: template
        ? `${template.name} (${template.context})`
        : 'Select or create a template',
    },
    {
      id: 'layout',
      label: 'Layout',
      complete: layoutComplete,
      hint: layoutComplete
        ? `${fields.length} field(s) on canvas`
        : 'Drag task fields onto the canvas',
    },
    {
      id: 'data',
      label: 'Data',
      complete: dataComplete,
      hint: dataComplete
        ? connectedFields.length
          ? `${connectedFields.length} field(s) connected to data`
          : 'No data connections — optional step'
        : 'Complete entity mappings and catalog sources',
    },
    {
      id: 'rules',
      label: 'Rules',
      complete: rulesComplete,
      hint: rulesComplete
        ? workflowCount
          ? `${workflowCount} automation rule(s)`
          : 'No rules — optional step'
        : 'Build show/hide flows and events',
    },
    {
      id: 'preview',
      label: 'Preview',
      complete: previewComplete,
      hint: previewComplete
        ? 'Preview reviewed'
        : 'Open Preview to check the form',
    },
    {
      id: 'publish',
      label: 'Publish',
      complete: publishComplete,
      hint: publishComplete
        ? `Published · v${template?.version ?? 1}`
        : 'Publish when all steps above are done',
    },
  ];
}
