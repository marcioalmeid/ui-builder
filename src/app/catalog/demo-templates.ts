import { ApiDataSource, FormField, RadioOption } from '../models/field';
import { TaskTemplate } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { DATA_CATALOG } from './data-catalog.items';
import { createShowFieldsWorkflowRule } from '../utils/workflow-migration';

function appendEmitEventToRule(rule: WorkflowRule, eventName: string): WorkflowRule {
  const lastNode = rule.nodes[rule.nodes.length - 1];
  if (!lastNode) return rule;

  const eventId = crypto.randomUUID();
  return {
    ...rule,
    nodes: [
      ...rule.nodes,
      {
        id: eventId,
        type: 'action-event',
        position: { x: (lastNode.position.x ?? 0) + 220, y: 0 },
        data: { eventName },
      },
    ],
    edges: [
      ...rule.edges,
      { id: crypto.randomUUID(), source: lastNode.id, target: eventId },
    ],
  };
}

function catalogField(
  id: string,
  label: string,
  catalogId: string,
  placeholder: string,
  required = false,
  hint?: string
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
  };
}

export function createNewTaskDemoTemplate(): TaskTemplate {
  const templateId = crypto.randomUUID();
  const taskTypeFieldId = crypto.randomUUID();
  const requestTypeFieldId = crypto.randomUUID();
  const budgetFieldId = crypto.randomUUID();
  const sectionHeaderFieldId = crypto.randomUUID();
  const platformFieldId = crypto.randomUUID();
  const vendorFieldId = crypto.randomUUID();
  const costBreakdownFieldId = crypto.randomUUID();

  return {
    id: templateId,
    name: 'New Task (Advertising)',
    context: 'advertising',
    version: 1,
    status: 'draft',
    updatedAt: Date.now(),
    layout: {
      dataBindings: [],
      workflowRules: [
        appendEmitEventToRule(
          createShowFieldsWorkflowRule(
            'Show advertising section when Task type is Digital Advertising',
            taskTypeFieldId,
            'equals',
            'digital-advertising',
            [
              sectionHeaderFieldId,
              platformFieldId,
              requestTypeFieldId,
              vendorFieldId,
              costBreakdownFieldId,
            ]
          ),
          'campaign.type.selected'
        ),
        appendEmitEventToRule(
          createShowFieldsWorkflowRule(
            'Show Budget when Request type is Budget change',
            requestTypeFieldId,
            'equals',
            'budget-change',
            [budgetFieldId]
          ),
          'budget.change.requested'
        ),
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
              id: sectionHeaderFieldId,
              type: 'section-header',
              label: 'Digital Advertising Details',
              hint: 'Shown via Rules when Task type is Digital Advertising',
              icon: 'view_agenda',
              required: false,
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            catalogField(
              platformFieldId,
              'Platform',
              'platforms',
              'Select platform',
              true,
              'Where the campaign runs.'
            ),
            catalogField(
              requestTypeFieldId,
              'Request type',
              'request-types',
              'Select request type',
              true,
              'Budget appears via Rules when you pick Budget change.'
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            catalogField(
              vendorFieldId,
              'Vendor',
              'vendors',
              'Select a vendor...',
              false,
              'For external media buys.'
            ),
            catalogField(
              budgetFieldId,
              'Budget',
              'budget-line-items',
              'Select a budget line item...',
              false,
              'Shown via Rules when Request type is Budget change.'
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            {
              id: costBreakdownFieldId,
              type: 'cost-breakdown',
              label: 'Cost breakdown',
              icon: 'calculate',
              required: false,
              hint: 'Net ad spend is calculated from gross budget, management fee, and additional fees.',
              managementFeePercent: 15,
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

export const DEMO_TEMPLATE_SEED_KEY = 'ui-builder-demo-seeded-v7';
