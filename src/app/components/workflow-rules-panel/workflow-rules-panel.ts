import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { getAllFields } from '../../utils/template-readiness';
import { getWorkflowSummary } from '../../utils/workflow-evaluation';

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

  addRule() {
    this.formService.addWorkflowRule();
    this.formService.focusSidebarSection('rules');
  }

  openRulesCanvas() {
    this.formService.requestRulesCanvasFocus();
  }
}
