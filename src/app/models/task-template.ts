import { DataBinding } from './data-binding';
import { FormRow } from './form';
import { ListViewConfig } from './list-view';
import { WorkflowRule } from './workflow-rule';

export type TemplateStatus = 'draft' | 'published';
export type RiskPolicy = 'NONE' | 'COSMETIC' | 'ADDITIVE';

export interface TaskTemplateLayout {
  rows: FormRow[];
  dataBindings: DataBinding[];
  workflowRules?: WorkflowRule[];
  /** Shared list/detail contract — columns and search index for the task hub. */
  listView?: ListViewConfig;
}

export interface TemplateVersionSnapshot {
  version: number;
  layout: TaskTemplateLayout;
}

export interface TaskTemplate {
  id: string;
  name: string;
  departments: string[];
  version: number;
  status: TemplateStatus;
  layout: TaskTemplateLayout;
  versions?: TemplateVersionSnapshot[];
  retiredFieldIds?: string[];
  riskPolicy?: RiskPolicy;
  updatedAt: number;
}

export function createEmptyTemplate(
  name: string,
  departments: string[] = []
): TaskTemplate {
  const id = crypto.randomUUID();
  return {
    id,
    name,
    departments,
    version: 0,
    status: 'draft',
    versions: [],
    retiredFieldIds: [],
    riskPolicy: 'ADDITIVE',
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
      listView: {
        columns: [],
        searchableFieldIds: [],
      },
    },
  };
}
