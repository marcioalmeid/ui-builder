import { DataBinding } from './data-binding';
import { FormRow } from './form';
import { WorkflowRule } from './workflow-rule';

export type TemplateStatus = 'draft' | 'published';

export interface TaskTemplateLayout {
  rows: FormRow[];
  dataBindings: DataBinding[];
  workflowRules?: WorkflowRule[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  context: string;
  version: number;
  status: TemplateStatus;
  layout: TaskTemplateLayout;
  updatedAt: number;
}

export const TASK_TEMPLATE_CONTEXTS = [
  { id: 'general', label: 'General Task' },
  { id: 'advertising', label: 'Digital Advertising' },
  { id: 'print', label: 'Print Media' },
  { id: 'social', label: 'Social Media' },
] as const;

export function createEmptyTemplate(
  name: string,
  context = 'general'
): TaskTemplate {
  const id = crypto.randomUUID();
  return {
    id,
    name,
    context,
    version: 1,
    status: 'draft',
    updatedAt: Date.now(),
    layout: {
      rows: [
        {
          id: crypto.randomUUID(),
          templateId: id,
          fields: [],
        },
      ],
      dataBindings: [],
      workflowRules: [],
    },
  };
}
