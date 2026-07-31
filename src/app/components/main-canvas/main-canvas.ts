import { Component, signal, inject, effect, computed } from '@angular/core';
import { FormEditorComponent } from './form-editor/form-editor.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormPreview } from './form-preview/form-preview';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormService } from '../../services/form.services';
import { TemplateSetupStepper } from '../template-setup-stepper/template-setup-stepper';
import { DevPayloadPanel } from '../dev-payload-panel/dev-payload-panel';
import { WorkflowBuilder } from '../workflow-builder/workflow-builder';
import { getAllFields, getFirstUnconfiguredApiField } from '../../utils/template-readiness';
import { buildInitialJobData } from '../../utils/job-validation';

export type CanvasTab = 'editor' | 'rules' | 'preview' | 'json';

@Component({
  selector: 'app-main-canvas',
  imports: [
    FormEditorComponent,
    MatButtonToggleModule,
    FormPreview,
    MatButtonModule,
    MatIcon,
    MatCheckboxModule,
    TemplateSetupStepper,
    DevPayloadPanel,
    WorkflowBuilder,
  ],
  templateUrl: './main-canvas.html',
  styleUrl: './main-canvas.scss',
})
export class MainCanvas {
  activeTab = signal<CanvasTab>('editor');
  simulateOperator = signal(false);
  formService = inject(FormService);

  isLayoutEmpty = computed(() => getAllFields(this.formService.rows()).length === 0);

  previewInteractive = computed(
    () => this.activeTab() === 'preview' && this.simulateOperator()
  );

  constructor() {
    effect(() => {
      this.formService.activeTemplateId();
      this.formService.previewVisited.set(false);
      this.formService.rulesVisited.set(false);
      this.formService.setActiveSetupStep('layout');
      this.activeTab.set('editor');
      this.simulateOperator.set(false);
    });

    effect(() => {
      if (this.formService.rulesCanvasFocusRequest() > 0) {
        this.onTabChange('rules');
      }
    });

    effect(() => {
      const fields = getAllFields(this.formService.rows());
      this.formService.previewJobData.set(buildInitialJobData(fields));
    });
  }

  onTabChange(tab: CanvasTab) {
    this.activeTab.set(tab);
    if (tab === 'preview') {
      this.formService.previewVisited.set(true);
      this.formService.setActiveSetupStep('preview');
    } else if (tab === 'rules') {
      this.formService.rulesVisited.set(true);
      this.formService.setActiveSetupStep('rules');
    } else if (tab === 'json') {
      this.formService.setActiveSetupStep('data');
    }
  }

  onStepAction(
    stepId: 'layout' | 'preview' | 'template' | 'data' | 'rules' | 'publish'
  ) {
    this.formService.setActiveSetupStep(stepId);

    if (stepId === 'preview') {
      this.onTabChange('preview');
    } else if (stepId === 'rules') {
      this.formService.focusSidebarSection('rules');
      this.onTabChange('rules');
      const rules = this.formService.workflowRules();
      const selected = this.formService.selectedWorkflowRuleId();
      if (rules.length && !selected) {
        this.formService.focusWorkflowRule(rules[0].id);
      }
    } else if (stepId === 'layout') {
      this.formService.focusSidebarSection('fields');
      this.onTabChange('editor');
    } else if (stepId === 'data') {
      this.formService.focusSidebarSection('data');
      this.onTabChange('editor');
      const field = getFirstUnconfiguredApiField(this.formService.rows());
      if (field) {
        this.formService.setSelectedField(field.id);
      }
    } else if (stepId === 'template') {
      this.formService.focusSidebarSection('template');
      this.onTabChange('editor');
    } else if (stepId === 'publish') {
      this.formService.requestPublishFocus();
    }
  }

  openFieldsSection() {
    this.formService.focusSidebarSection('fields');
  }

  onPreviewFieldChange(fieldId: string, value: unknown) {
    this.formService.previewJobData.update((data) => ({ ...data, [fieldId]: value }));
  }
}
