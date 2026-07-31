export type WorkflowNodeType =
  | 'trigger'
  | 'condition'
  | 'action-show'
  | 'action-hide'
  | 'action-event';

export type WorkflowConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'notEmpty'
  | 'isEmpty'
  | 'isTrue'
  | 'isFalse'
  | 'contains'
  | 'greaterThan'
  | 'lessThan';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowNodeData {
  fieldId?: string;
  operator?: WorkflowConditionOperator;
  value?: string;
  targetFieldId?: string;
  eventName?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const WORKFLOW_NODE_META: Record<
  WorkflowNodeType,
  { label: string; icon: string; color: string }
> = {
  trigger: { label: 'When field changes', icon: 'bolt', color: '#22c55e' },
  condition: { label: 'If', icon: 'call_split', color: '#eab308' },
  'action-show': { label: 'Show field', icon: 'visibility', color: '#3b82f6' },
  'action-hide': { label: 'Hide field', icon: 'visibility_off', color: '#64748b' },
  'action-event': { label: 'Emit event', icon: 'outgoing_mail', color: '#a855f7' },
};

export function createDefaultWorkflowRule(name = 'New rule'): WorkflowRule {
  const triggerId = crypto.randomUUID();
  const conditionId = crypto.randomUUID();
  const actionId = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    name,
    enabled: true,
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { fieldId: '' },
      },
      {
        id: conditionId,
        type: 'condition',
        position: { x: 220, y: 0 },
        data: { operator: 'equals', value: '' },
      },
      {
        id: actionId,
        type: 'action-show',
        position: { x: 440, y: 0 },
        data: { targetFieldId: '' },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: triggerId, target: conditionId },
      { id: crypto.randomUUID(), source: conditionId, target: actionId },
    ],
  };
}
