import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { getAllFields } from '../../utils/template-readiness';
import { getWorkflowSummary } from '../../utils/workflow-evaluation';
import {
  getFirstInvalidWorkflowIssue,
  getWorkflowRuleIssues,
} from '../../utils/workflow-readiness';

@Component({
  selector: 'app-workflow-rules-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './workflow-rules-panel.html',
  styleUrl: './workflow-rules-panel.css',
})
export class WorkflowRulesPanel {
  formService = inject(FormService);

  summary = computed(() =>
    getWorkflowSummary(this.formService.workflowRules(), getAllFields(this.formService.rows()))
  );

  rules = computed(() => this.formService.workflowRules());

  invalidRuleIds = computed(() => {
    const fields = getAllFields(this.formService.rows());
    const ids = new Set<string>();
    for (const rule of this.rules()) {
      if (!rule.enabled) continue;
      if (getWorkflowRuleIssues(rule, fields).length) {
        ids.add(rule.id);
      }
    }
    return ids;
  });

  hasRuleIssues(ruleId: string): boolean {
    return this.invalidRuleIds().has(ruleId);
  }

  addRule() {
    this.formService.addWorkflowRule();
  }

  openRule(ruleId: string) {
    const fields = getAllFields(this.formService.rows());
    const rule = this.rules().find((item) => item.id === ruleId);
    const firstIssue = rule ? getWorkflowRuleIssues(rule, fields)[0] : undefined;
    this.formService.focusWorkflowRule(ruleId, firstIssue?.nodeId);
  }

  openRulesCanvas() {
    const fields = getAllFields(this.formService.rows());
    const firstIssue = getFirstInvalidWorkflowIssue(this.formService.workflowRules(), fields);
    if (firstIssue) {
      this.formService.focusWorkflowRule(firstIssue.ruleId, firstIssue.nodeId);
      return;
    }

    const rules = this.formService.workflowRules();
    const selected = this.formService.selectedWorkflowRuleId();
    if (selected) {
      this.formService.focusWorkflowRule(selected);
      return;
    }
    if (rules.length) {
      this.formService.focusWorkflowRule(rules[0].id);
      return;
    }
    this.formService.requestRulesCanvasFocus();
  }
}
