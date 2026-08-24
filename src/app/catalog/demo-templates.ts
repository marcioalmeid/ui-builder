import { ApiDataSource, FormField, RadioOption } from '../models/field';
import { TaskTemplate } from '../models/task-template';
import { WorkflowRule } from '../models/workflow-rule';
import { DATA_CATALOG } from './data-catalog.items';
import { EVENT_CATALOG, resolveEventName } from './event-catalog.items';
import { createShowFieldsWorkflowRule } from '../utils/workflow-migration';

function appendEmitEventToRule(rule: WorkflowRule, eventCatalogId: string): WorkflowRule {
  const lastNode = rule.nodes[rule.nodes.length - 1];
  if (!lastNode) return rule;

  const catalogItem = EVENT_CATALOG.find((entry) => entry.id === eventCatalogId);
  const eventName = catalogItem ? resolveEventName(catalogItem) : eventCatalogId;
  const eventId = crypto.randomUUID();
  return {
    ...rule,
    nodes: [
      ...rule.nodes,
      {
        id: eventId,
        type: 'action-event',
        position: { x: (lastNode.position.x ?? 0) + 220, y: 0 },
        data: { eventCatalogId, eventName },
      },
    ],
    edges: [
      ...rule.edges,
      { id: crypto.randomUUID(), source: lastNode.id, target: eventId },
    ],
  };
}

function catalogItem(catalogId: string) {
  return DATA_CATALOG.find((entry) => entry.id === catalogId);
}

function mappedField(
  id: string,
  type: FormField['type'],
  label: string,
  icon: string,
  catalogId: string,
  entityFieldKey: string,
  extra: Partial<FormField> = {}
): FormField {
  return {
    id,
    type,
    label,
    icon,
    required: false,
    entityMapping: { catalogId, entityFieldKey },
    ...extra,
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
  const item = catalogItem(catalogId);
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

export interface AdvertisingFixture {
  template: TaskTemplate;
  titleId: string;
  taskTypeId: string;
  vendorId: string;
  descriptionId: string;
  platformId: string;
}

export function createAdvertisingFixture(
  name = 'New Task (Advertising)'
): AdvertisingFixture {
  const templateId = crypto.randomUUID();
  const taskTypeFieldId = crypto.randomUUID();
  const requestTypeFieldId = crypto.randomUUID();
  const budgetFieldId = crypto.randomUUID();
  const sectionHeaderFieldId = crypto.randomUUID();
  const platformFieldId = crypto.randomUUID();
  const vendorFieldId = crypto.randomUUID();
  const costBreakdownFieldId = crypto.randomUUID();
  const titleId = crypto.randomUUID();
  const descriptionId = crypto.randomUUID();

  const template: TaskTemplate = {
    id: templateId,
    name,
    context: 'advertising',
    departments: [],
    version: 0,
    status: 'draft',
    versions: [],
    retiredFieldIds: [],
    riskPolicy: 'ADDITIVE',
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
            mappedField(
              titleId,
              'text',
              'Title',
              'text_fields',
              'task-types',
              'name',
              {
                required: true,
                placeholder: "Confirm next month's Honda budget",
              }
            ),
          ],
        },
        {
          id: crypto.randomUUID(),
          templateId,
          fields: [
            mappedField(
              descriptionId,
              'textarea',
              'Description',
              'notes',
              'task-types',
              'description',
              { placeholder: 'Add context for the operator...' }
            ),
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
            mappedField(
              crypto.randomUUID(),
              'datepicker',
              'Due date',
              'calendar_month',
              'task-types',
              'due_date',
              { placeholder: 'mm/dd/yyyy' }
            ),
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
              dataCatalogId: 'budget-line-items',
              dataSource: catalogItem('budget-line-items')?.dataSource,
            },
          ],
        },
      ],
    },
  };

  return {
    template,
    titleId,
    taskTypeId: taskTypeFieldId,
    vendorId: vendorFieldId,
    descriptionId,
    platformId: platformFieldId,
  };
}

export function createNewTaskDemoTemplate(): TaskTemplate {
  return createAdvertisingFixture().template;
}

/** @deprecated use createNewTaskDemoTemplate */
export function createAdvertisingDemoTemplate(): TaskTemplate {
  return createNewTaskDemoTemplate();
}
