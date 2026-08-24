import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormService } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import { EventCatalogService } from '../../services/event-catalog.service';
import {
  EventCatalogItem,
  EVENT_KIND_META,
  resolveEventKind,
  resolveEventName,
} from '../../catalog/event-catalog.items';
import {
  WORKFLOW_NODE_META,
  WorkflowConditionOperator,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRule,
} from '../../models/workflow-rule';
import { WorkflowEventConfig } from '../../models/workflow-event';
import { getAllFields } from '../../utils/template-readiness';
import { evaluateWorkflowRules, formatWorkflowEventSummary } from '../../utils/workflow-evaluation';
import {
  getTriggerFieldProfile,
  getWorkflowFieldProfile,
  normalizeConditionForProfile,
  operatorNeedsValue,
  WorkflowFieldProfile,
} from '../../utils/workflow-field-profile';
import {
  getWorkflowRuleIssues,
  WorkflowRuleIssue,
} from '../../utils/workflow-readiness';
import { EventCatalogPicker } from '../event-catalog-picker/event-catalog-picker';

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    EventCatalogPicker,
  ],
  templateUrl: './workflow-builder.html',
  styleUrl: './workflow-builder.css',
})
export class WorkflowBuilder {
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);
  private eventCatalogService = inject(EventCatalogService);

  rules = computed(() => this.formService.workflowRules());
  fields = computed(() => getAllFields(this.formService.rows()));
  firstDepartment = computed(
    () => this.formService.activeTemplate()?.departments?.[0] ?? ''
  );
  triggerFields = computed(() =>
    this.fields().filter((field) => field.type !== 'section-header' && field.type !== 'button')
  );
  targetFields = computed(() => this.fields());

  selectedRule = computed(() => {
    const rules = this.rules();
    const selectedId = this.formService.selectedWorkflowRuleId();
    return rules.find((rule) => rule.id === selectedId) ?? rules[0];
  });

  focusedNodeId = computed(() => this.formService.focusedWorkflowNodeId());

  /** Enabled-rule issues keyed by rule id (for canvas badges). */
  issuesByRuleId = computed(() => {
    const fields = this.fields();
    const map = new Map<string, WorkflowRuleIssue[]>();
    for (const rule of this.rules()) {
      if (!rule.enabled) continue;
      const issues = getWorkflowRuleIssues(rule, fields);
      if (issues.length) {
        map.set(rule.id, issues);
      }
    }
    return map;
  });

  ruleIssues(ruleId: string): WorkflowRuleIssue[] {
    return this.issuesByRuleId().get(ruleId) ?? [];
  }

  nodeIssues(ruleId: string, nodeId: string): WorkflowRuleIssue[] {
    return this.ruleIssues(ruleId).filter((issue) => issue.nodeId === nodeId);
  }

  hasRuleIssues(ruleId: string): boolean {
    return this.ruleIssues(ruleId).length > 0;
  }

  hasNodeIssues(ruleId: string, nodeId: string): boolean {
    return this.nodeIssues(ruleId, nodeId).length > 0;
  }

  liveEvents = computed(() =>
    evaluateWorkflowRules(
      this.rules().filter((rule) => rule.enabled),
      this.formService.previewJobData(),
      {
        fields: this.fields(),
        templateId: this.formService.activeTemplate()?.id,
        templateVersion: this.formService.activeTemplate()?.version,
      }
    ).events
  );

  formatEventSummary = formatWorkflowEventSummary;

  nodeMeta = WORKFLOW_NODE_META;
  operatorNeedsValue = operatorNeedsValue;

  constructor() {
    effect(() => {
      const ruleId = this.formService.selectedWorkflowRuleId();
      const nodeId = this.formService.focusedWorkflowNodeId();
      this.formService.rulesCanvasFocusRequest();

      if (!ruleId) return;

      // Wait a frame so the expanded canvas / invalid node styles are painted.
      queueMicrotask(() =>
        requestAnimationFrame(() => this.scrollToWorkflowTarget(ruleId, nodeId))
      );
    });
  }

  addRule() {
    this.formService.addWorkflowRule(`Rule ${this.rules().length + 1}`);
  }

  selectRule(ruleId: string) {
    const firstIssue = this.ruleIssues(ruleId)[0];
    this.formService.focusWorkflowRule(ruleId, firstIssue?.nodeId);
  }

  focusNode(rule: WorkflowRule, nodeId: string, event: Event) {
    event.stopPropagation();
    this.formService.focusWorkflowRule(rule.id, nodeId);
  }

  updateRule(rule: WorkflowRule, patch: Partial<WorkflowRule>) {
    this.formService.updateWorkflowRule(rule.id, patch);
  }

  deleteRule(ruleId: string) {
    this.formService.deleteWorkflowRule(ruleId);
  }

  private scrollToWorkflowTarget(ruleId: string, nodeId: string | null) {
    document
      .getElementById(`workflow-rule-${ruleId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (nodeId) {
      document.getElementById(`workflow-node-${nodeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }

  triggerProfile(rule: WorkflowRule): WorkflowFieldProfile | null {
    return getTriggerFieldProfile(rule.nodes, this.fields(), (id) =>
      this.catalogService.getById(id)
    );
  }

  onTriggerFieldChange(rule: WorkflowRule, nodeId: string, fieldId: string) {
    const nodes = rule.nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, fieldId } };
      }
      if (node.type === 'condition') {
        const profile = getWorkflowFieldProfile(
          this.fields().find((field) => field.id === fieldId),
          (id) => this.catalogService.getById(id)
        );
        const normalized = normalizeConditionForProfile(
          node.data.operator,
          node.data.value,
          profile
        );
        return { ...node, data: { ...node.data, ...normalized } };
      }
      return node;
    });

    this.formService.updateWorkflowRule(rule.id, { nodes });
  }

  onConditionOperatorChange(
    rule: WorkflowRule,
    nodeId: string,
    operator: WorkflowConditionOperator
  ) {
    const node = rule.nodes.find((item) => item.id === nodeId);
    if (!node) return;

    const profile = this.triggerProfile(rule);
    const normalized = normalizeConditionForProfile(operator, node.data.value, profile);
    this.updateNode(rule, nodeId, normalized);
  }

  onConditionValueChange(rule: WorkflowRule, nodeId: string, value: string) {
    this.updateNode(rule, nodeId, { value });
  }

  /** Prefer catalog id; fall back to matching free-text eventName for older rules. */
  eventCatalogSelectionId(node: WorkflowNode): string {
    if (node.data.eventCatalogId) return node.data.eventCatalogId;
    const eventName = node.data.eventName?.trim();
    if (!eventName) return '';
    return this.eventCatalogService.getByEventName(eventName)?.id ?? '';
  }

  eventCatalogItem(node: WorkflowNode): EventCatalogItem | undefined {
    const id = this.eventCatalogSelectionId(node);
    return id ? this.eventCatalogService.getById(id) : undefined;
  }

  eventKind(node: WorkflowNode) {
    const item = this.eventCatalogItem(node);
    return item ? resolveEventKind(item) : 'signal';
  }

  eventKindLabel(node: WorkflowNode): string {
    return EVENT_KIND_META[this.eventKind(node)].label;
  }

  onEventCatalogChange(rule: WorkflowRule, nodeId: string, item: EventCatalogItem) {
    const kind = resolveEventKind(item);
    const eventConfig: WorkflowEventConfig | undefined =
      kind === 'email'
        ? { email: { ...(item.email ?? {}) } }
        : kind === 'api'
          ? {
              api: {
                url: item.api?.url ?? '',
                method: item.api?.method ?? 'POST',
                body: item.api?.body ? { ...item.api.body } : undefined,
              },
            }
          : undefined;

    this.updateNode(rule, nodeId, {
      eventCatalogId: item.id,
      eventName: resolveEventName(item),
      eventConfig,
    });
  }

  onEventEmailChange(
    rule: WorkflowRule,
    nodeId: string,
    patch: Partial<NonNullable<WorkflowEventConfig['email']>>
  ) {
    const node = rule.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    this.updateNode(rule, nodeId, {
      eventConfig: {
        ...node.data.eventConfig,
        email: { ...node.data.eventConfig?.email, ...patch },
      },
    });
  }

  onEventApiChange(
    rule: WorkflowRule,
    nodeId: string,
    patch: Partial<NonNullable<WorkflowEventConfig['api']>>
  ) {
    const node = rule.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const current = node.data.eventConfig?.api;
    this.updateNode(rule, nodeId, {
      eventConfig: {
        ...node.data.eventConfig,
        api: {
          url: patch.url ?? current?.url ?? '',
          method: patch.method ?? current?.method ?? 'POST',
          body: patch.body ?? current?.body,
        },
      },
    });
  }

  updateNode(rule: WorkflowRule, nodeId: string, data: WorkflowNode['data']) {
    this.formService.updateWorkflowRule(rule.id, {
      nodes: rule.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  }

  addNode(rule: WorkflowRule, type: WorkflowNodeType) {
    const lastNode = rule.nodes[rule.nodes.length - 1];
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      position: { x: (lastNode?.position.x ?? 0) + 220, y: 0 },
      data: this.defaultNodeData(type, rule),
    };

    const nodes = [...rule.nodes, newNode];
    const edges = lastNode
      ? [
          ...rule.edges,
          { id: crypto.randomUUID(), source: lastNode.id, target: newNode.id },
        ]
      : rule.edges;

    this.formService.updateWorkflowRule(rule.id, { nodes, edges });
  }

  removeNode(rule: WorkflowRule, nodeId: string) {
    if (rule.nodes.length <= 1) return;

    const nodes = rule.nodes.filter((node) => node.id !== nodeId);
    const edges = rule.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );

    this.formService.updateWorkflowRule(rule.id, { nodes, edges });
  }

  private defaultNodeData(
    type: WorkflowNodeType,
    rule?: WorkflowRule
  ): WorkflowNode['data'] {
    switch (type) {
      case 'trigger':
        return { fieldId: this.triggerFields()[0]?.id ?? '' };
      case 'condition': {
        const profile = rule ? this.triggerProfile(rule) : null;
        return normalizeConditionForProfile('equals', '', profile);
      }
      case 'action-show':
      case 'action-hide':
        return { targetFieldId: this.targetFields()[0]?.id ?? '' };
      case 'action-event': {
        const fallback =
          this.eventCatalogService.getById('field.updated') ??
          this.eventCatalogService.getForContext(this.firstDepartment())[0];
        if (!fallback) {
          return { eventName: 'field.updated' };
        }
        const kind = resolveEventKind(fallback);
        return {
          eventCatalogId: fallback.id,
          eventName: resolveEventName(fallback),
          eventConfig:
            kind === 'email'
              ? { email: { ...(fallback.email ?? {}) } }
              : kind === 'api'
                ? {
                    api: {
                      url: fallback.api?.url ?? '',
                      method: fallback.api?.method ?? 'POST',
                      body: fallback.api?.body ? { ...fallback.api.body } : undefined,
                    },
                  }
                : undefined,
        };
      }
    }
  }
}
