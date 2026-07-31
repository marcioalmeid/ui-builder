import { ApiDataSource, FormField, RadioOption } from '../models/field';
import { TaskTemplate } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { DATA_CATALOG } from './data-catalog.items';

function catalogField(
  id: string,
  label: string,
  catalogId: string,
  placeholder: string,
  required = false,
  hint?: string,
  visibility?: FormField['visibilityRule']
): FormField {
  const item = DATA_CATALOG.find((entry) => entry.id === catalogId);
  const staticOptions: RadioOption[] =
    catalogId === 'users'
      ? [
          { label: 'Alice Johnson', value: '1' },
          { label: 'Bob Smith', value: '2' },
        ]
      : catalogId === 'task-types'
        ? [
            { label: 'Digital Advertising', value: 'digital-advertising' },
            { label: 'Print Media', value: 'print' },
          ]
        : catalogId === 'platforms'
          ? [
              { label: 'Google Ads', value: 'google-ads' },
              { label: 'Meta Ads', value: 'meta-ads' },
            ]
          : catalogId === 'request-types'
            ? [
                { label: 'New campaign', value: 'new-campaign' },
                { label: 'Budget change', value: 'budget-change' },
              ]
            : catalogId === 'vendors'
              ? [
                  { label: 'Horizon Media', value: 'vendor-a' },
                  { label: 'Spark Digital', value: 'vendor-b' },
                ]
              : [
                  { label: 'Honda Q3 Brand Campaign', value: 'honda-q3' },
                  { label: 'Always-on Search', value: 'always-on-search' },
                ];

  return {
    id,
    type: 'dropdown',
    label,
    icon: 'arrow_drop_down_circle',
    required,
    placeholder,
    hint,
    optionsSource: 'api',
    dataCatalogId: catalogId,
    dataSource: item?.dataSource as ApiDataSource,
    options: staticOptions,
    visibilityRule: visibility,
  };
}

function createShowBudgetOnBudgetChangeRule(
  requestTypeFieldId: string,
  budgetFieldId: string
): WorkflowRule {
  const triggerId = crypto.randomUUID();
  const conditionId = crypto.randomUUID();
  const actionId = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    name: 'Show Budget when Request type is Budget change',
    enabled: true,
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { fieldId: requestTypeFieldId },
      },
      {
        id: conditionId,
        type: 'condition',
        position: { x: 220, y: 0 },
        data: { operator: 'equals', value: 'budget-change' },
      },
      {
        id: actionId,
        type: 'action-show',
        position: { x: 440, y: 0 },
        data: { targetFieldId: budgetFieldId },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: triggerId, target: conditionId },
      { id: crypto.randomUUID(), source: conditionId, target: actionId },
    ],
  };
}

export function createNewTaskDemoTemplate(): TaskTemplate {
  const templateId = crypto.randomUUID();
  const taskTypeFieldId = crypto.randomUUID();
  const requestTypeFieldId = crypto.randomUUID();
  const budgetFieldId = crypto.randomUUID();

  const advertisingVisibility: FormField['visibilityRule'] = {
    fieldId: taskTypeFieldId,
    operator: 'equals',
    value: 'digital-advertising',
  };

  return {
    id: templateId,
    name: 'New Task (Advertising)',
    context: 'advertising',
    version: 1,
    status: 'published',
    updatedAt: Date.now(),
    layout: {
      dataBindings: [],
      workflowRules: [
        createShowBudgetOnBudgetChangeRule(requestTypeFieldId, budgetFieldId),
      ],
      rows: [
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Title',
              icon: 'text_fields',
              required: true,
              placeholder: "Confirm next month's Honda budget",
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'textarea',
              label: 'Description',
              icon: 'notes',
              required: false,
              placeholder: 'Add context for the operator...',
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            catalogField(
              taskTypeFieldId,
              'Task type',
              'task-types',
              'Select task type',
              true
            ),
            {
              id: crypto.randomUUID(),
              type: 'datepicker',
              label: 'Due date',
              icon: 'calendar_month',
              required: false,
              placeholder: 'mm/dd/yyyy',
            },
            catalogField(
              crypto.randomUUID(),
              'Assign to',
              'users',
              'Unassigned',
              false
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'section-header',
              label: 'Digital Advertising Details',
              hint: 'Shown when task type is Digital Advertising',
              icon: 'view_agenda',
              required: false,
              visibilityRule: advertisingVisibility,
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            catalogField(
              crypto.randomUUID(),
              'Platform',
              'platforms',
              'Select platform',
              true,
              'Where the campaign runs.',
              advertisingVisibility
            ),
            catalogField(
              requestTypeFieldId,
              'Request type',
              'request-types',
              'Select request type',
              true,
              'Budget line item appears when you pick Budget change.',
              advertisingVisibility
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            catalogField(
              crypto.randomUUID(),
              'Vendor',
              'vendors',
              'Select a vendor...',
              false,
              'For external media buys.',
              advertisingVisibility
            ),
            catalogField(
              budgetFieldId,
              'Budget',
              'budget-line-items',
              'Select a budget line item...',
              false,
              'Shown via Rules when Request type is Budget change.',
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'cost-breakdown',
              label: 'Cost breakdown',
              icon: 'calculate',
              required: false,
              hint: 'Net ad spend is calculated from gross budget, management fee, and additional fees.',
              managementFeePercent: 15,
              visibilityRule: advertisingVisibility,
            },
          ],
        },
      ],
    },
  };
}

/** @deprecated use createNewTaskDemoTemplate */
export function createAdvertisingDemoTemplate(): TaskTemplate {
  return createNewTaskDemoTemplate();
}

export const DEMO_TEMPLATE_SEED_KEY = 'ui-builder-demo-seeded-v3';
