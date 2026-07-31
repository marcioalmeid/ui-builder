import { Component, computed, inject, input, output } from '@angular/core';
import { FormService } from '../../../services/form.services';
import { FieldPreview } from '../field-preview/field-preview';
import { FormRow } from '../../../models/form';
import { FormField } from '../../../models/field';
import { getHiddenFieldHints, isFieldVisible } from '../../../utils/field-visibility';
import { getAllFields } from '../../../utils/template-readiness';

@Component({
  selector: 'app-form-preview',
  imports: [FieldPreview],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.css',
})
export class FormPreview {
  templateId = input<string>();
  interactive = input(false);
  jobData = input<Record<string, unknown>>({});
  fieldValueChange = output<{ fieldId: string; value: unknown }>();

  formService = inject(FormService);

  displayRows = computed<FormRow[]>(() => {
    const id = this.templateId();
    if (id) {
      return this.formService.getTemplate(id)?.layout.rows ?? [];
    }
    return this.formService.rows();
  });

  hiddenFieldHints = computed(() => {
    if (!this.interactive()) return [];
    const fields = getAllFields(this.displayRows());
    return getHiddenFieldHints(fields, this.jobData(), this.workflowRules());
  });

  onFieldValueChange(fieldId: string, value: unknown) {
    this.fieldValueChange.emit({ fieldId, value });
  }

  isVisible(field: FormField): boolean {
    return isFieldVisible(field, this.jobData(), this.workflowRules());
  }

  private workflowRules() {
    const id = this.templateId();
    if (id) {
      return this.formService.getTemplate(id)?.layout.workflowRules ?? [];
    }
    return this.formService.workflowRules();
  }
}
