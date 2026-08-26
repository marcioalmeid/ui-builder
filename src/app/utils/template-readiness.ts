import { FormRow } from '../models/form';
import { FormField } from '../models/field';
import { DataBinding } from '../models/data-binding';
import { TaskTemplate } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import {
  getFieldDataConnectionError,
  isFieldBindingConfigured,
  isOptionField,
  requiresDataConnection,
  usesApiDataSource,
} from './field-data-binding';
import {
  areAllWorkflowRulesValid,
  getInvalidWorkflowRuleIssues,
} from './workflow-readiness';

export { isOptionField } from './field-data-binding';

export type SetupStepId = 'template' | 'layout' | 'data' | 'rules' | 'preview' | 'publish';

export interface SetupStep {
  id: SetupStepId;
  label: string;
  complete: boolean;
  hint: string;
}

export function setupStepFromSidebarSection(
  section: 'template' | 'fields' | 'data' | 'rules' | 'list'
): SetupStepId {
  const map: Record<'template' | 'fields' | 'data' | 'rules' | 'list', SetupStepId> = {
    template: 'template',
    fields: 'layout',
    data: 'data',
    rules: 'rules',
    list: 'layout',
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
  _dataBindings: DataBinding[] = [],
  workflowRules: WorkflowRule[] = []
): { valid: boolean; errors: string[] } {
  const fields = getAllFields(rows);
  const errors: string[] = [];

  if (fields.length === 0) {
    errors.push('Add at least one field to the template layout.');
  }

  for (const field of fields) {
    if (!requiresDataConnection(field)) continue;

    const connectionError = getFieldDataConnectionError(field);
    if (connectionError) {
      errors.push(connectionError);
    }
  }

  for (const issue of getInvalidWorkflowRuleIssues(workflowRules, fields)) {
    errors.push(`Rule "${issue.ruleName}": ${issue.message}`);
  }

  return { valid: errors.length === 0, errors };
}

export function getFirstUnconfiguredApiField(rows: FormRow[]): FormField | undefined {
  return getAllFields(rows).find(
    (field) => requiresDataConnection(field) && !isFieldBindingConfigured(field)
  );
}

export function getUnconfiguredDataFields(rows: FormRow[]): FormField[] {
  return getAllFields(rows).filter(
    (field) => requiresDataConnection(field) && !isFieldBindingConfigured(field)
  );
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
  readyToPublish: boolean,
  workflowRules: WorkflowRule[] = []
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
      const unconfigured = getUnconfiguredDataFields(rows);
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
    case 'rules': {
      const invalidRules = getInvalidWorkflowRuleIssues(workflowRules, getAllFields(rows));
      const message =
        invalidRules.length === 1
          ? `Rule "${invalidRules[0].ruleName}": ${invalidRules[0].message}`
          : `${invalidRules.length} rule(s) need fixes before continuing.`;
      return {
        stepId: 'rules',
        message,
        buttonLabel: 'Fix rules',
      };
    }
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
  workflowRules: WorkflowRule[],
  previewVisited: boolean
): SetupStep[] {
  const fields = getAllFields(rows);
  const connectableFields = fields.filter(requiresDataConnection);
  const connectedFields = connectableFields.filter(isFieldBindingConfigured);
  const unconfiguredCount = connectableFields.length - connectedFields.length;
  const enabledRules = workflowRules.filter((rule) => rule.enabled);
  const invalidRuleCount = getInvalidWorkflowRuleIssues(workflowRules, fields).length;

  const templateComplete = Boolean(template?.name);
  const layoutComplete = templateComplete && fields.length > 0;
  const dataComplete =
    layoutComplete && connectableFields.every(isFieldBindingConfigured);
  const rulesValid = areAllWorkflowRulesValid(workflowRules, fields);
  const rulesComplete = dataComplete && rulesValid;
  const previewComplete = previewVisited && rulesComplete;
  const publishComplete = template?.status === 'published';

  return [
    {
      id: 'template',
      label: 'Template',
      complete: templateComplete,
      hint: template
        ? `${template.name} (${(template.departments?.[0] || 'None')})`
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
        ? `${connectedFields.length}/${connectableFields.length} field(s) connected to data`
        : unconfiguredCount === 1
          ? '1 field still needs a data connection'
          : `${unconfiguredCount} field(s) still need data connections`,
    },
    {
      id: 'rules',
      label: 'Rules',
      complete: rulesComplete,
      hint: !dataComplete
        ? 'Connect all fields in Data first'
        : rulesComplete
          ? enabledRules.length
            ? `${enabledRules.length} valid rule(s)`
            : 'No rules — optional step'
          : invalidRuleCount === 1
            ? '1 rule needs fixes'
            : `${invalidRuleCount} rule(s) need fixes`,
    },
    {
      id: 'preview',
      label: 'Preview',
      complete: previewComplete,
      hint: !dataComplete
        ? 'Connect all fields in Data first'
        : previewComplete
          ? 'Preview reviewed'
          : 'Open Preview to check the form',
    },
    {
      id: 'publish',
      label: 'Publish',
      complete: publishComplete,
      hint: publishComplete
        ? `Published · v${template?.version ?? 1}`
        : dataComplete
          ? 'Publish when all steps above are done'
          : 'Connect every field before publishing',
    },
  ];
}
