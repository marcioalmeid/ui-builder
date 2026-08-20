import { Component, computed, inject, input, output } from '@angular/core';
import { FormService } from '../../../services/form.services';
import { FieldPreview } from '../field-preview/field-preview';
import { FormRow } from '../../../models/form';
import { FormField } from '../../../models/field';
import { TaskTemplate, TaskTemplateLayout } from '../../../models/task-template';
import { getHiddenFieldHints, isFieldVisible } from '../../../utils/field-visibility';
import { getAllFields } from '../../../utils/template-readiness';
import {
  formatWorkflowEventSummary,
  getWorkflowEmittedEvents,
} from '../../../utils/workflow-evaluation';

@Component({
  selector: 'app-form-preview',
  imports: [FieldPreview],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.css',
})
export class FormPreview {
  templateId = input<string>();
  layout = input<TaskTemplateLayout>();
  interactive = input(false);
  jobData = input<Record<string, unknown>>({});
  fieldValueChange = output<{ fieldId: string; value: unknown }>();

  formService = inject(FormService);

  displayRows = computed<FormRow[]>(() => this.resolvedLayout()?.rows ?? []);

  hiddenFieldHints = computed(() => {
    if (!this.interactive()) return [];
    const fields = getAllFields(this.displayRows());
    return getHiddenFieldHints(fields, this.jobData(), this.workflowRules());
  });

  emittedEvents = computed(() => {
    if (!this.interactive()) return [];
    const template = this.activeTemplate();
    const fields = getAllFields(this.displayRows());
    return getWorkflowEmittedEvents(this.workflowRules(), this.jobData(), {
      fields,
      templateId: template?.id,
      templateVersion: template?.version,
    });
  });

  formatEventSummary = formatWorkflowEventSummary;

  onFieldValueChange(fieldId: string, value: unknown) {
    this.fieldValueChange.emit({ fieldId, value });
  }

  isVisible(field: FormField): boolean {
    return isFieldVisible(field, this.jobData(), this.workflowRules());
  }

  private workflowRules() {
    return this.resolvedLayout()?.workflowRules ?? [];
  }

  private resolvedLayout(): TaskTemplateLayout | undefined {
    const override = this.layout();
    if (override) return override;
    const id = this.templateId();
    if (id) {
      return this.formService.getTemplate(id)?.layout;
    }
    const active = this.formService.activeTemplate();
    if (!active) return undefined;
    return {
      rows: this.formService.rows(),
      dataBindings: this.formService.dataBindings(),
      workflowRules: this.formService.workflowRules(),
    };
  }

  private activeTemplate(): TaskTemplate | undefined {
    const id = this.templateId();
    if (id) {
      return this.formService.getTemplate(id);
    }
    return this.formService.activeTemplate();
  }
}
