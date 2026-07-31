import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormService } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import {
  WORKFLOW_NODE_META,
  WorkflowConditionOperator,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRule,
} from '../../models/workflow-rule';
import { getAllFields } from '../../utils/template-readiness';
import { evaluateWorkflowRules } from '../../utils/workflow-evaluation';
import {
  getTriggerFieldProfile,
  getWorkflowFieldProfile,
  normalizeConditionForProfile,
  operatorNeedsValue,
  WorkflowFieldProfile,
} from '../../utils/workflow-field-profile';

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
  ],
  templateUrl: './workflow-builder.html',
  styleUrl: './workflow-builder.css',
})
export class WorkflowBuilder {
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);
  selectedRuleId = signal<string | null>(null);

  rules = computed(() => this.formService.workflowRules());
  fields = computed(() => getAllFields(this.formService.rows()));
  triggerFields = computed(() =>
    this.fields().filter((field) => field.type !== 'section-header')
  );
  targetFields = computed(() => this.fields());

  selectedRule = computed(() =>
    this.rules().find((rule) => rule.id === this.selectedRuleId()) ?? this.rules()[0]
  );

  liveEvents = computed(() =>
    evaluateWorkflowRules(
      this.rules().filter((rule) => rule.enabled),
      this.formService.previewJobData()
    ).events
  );

  nodeMeta = WORKFLOW_NODE_META;
  operatorNeedsValue = operatorNeedsValue;

  addRule() {
    const rule = this.formService.addWorkflowRule(`Rule ${this.rules().length + 1}`);
    this.selectedRuleId.set(rule.id);
  }

  selectRule(ruleId: string) {
    this.selectedRuleId.set(ruleId);
  }

  updateRule(rule: WorkflowRule, patch: Partial<WorkflowRule>) {
    this.formService.updateWorkflowRule(rule.id, patch);
  }

  deleteRule(ruleId: string) {
    this.formService.deleteWorkflowRule(ruleId);
    if (this.selectedRuleId() === ruleId) {
      this.selectedRuleId.set(this.rules()[0]?.id ?? null);
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
      case 'action-event':
        return { eventName: 'field.updated' };
    }
  }
}
