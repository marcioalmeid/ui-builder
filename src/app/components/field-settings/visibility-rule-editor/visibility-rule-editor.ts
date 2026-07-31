import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FieldVisibilityRule, FormField } from '../../../models/field';
import { FormService } from '../../../services/form.services';

@Component({
  selector: 'app-visibility-rule-editor',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './visibility-rule-editor.html',
})
export class VisibilityRuleEditor {
  fieldId = input.required<string>();
  rule = input<FieldVisibilityRule | undefined>();

  ruleChange = output<FieldVisibilityRule | undefined>();

  private formService = inject(FormService);

  candidateFields = computed(() =>
    this.formService
      .rows()
      .flatMap((row) => row.fields)
      .filter((f) => f.id !== this.fieldId() && f.type !== 'section-header' && f.type !== 'button')
  );

  enabled = computed(() => Boolean(this.rule()));

  onToggle(enabled: boolean) {
    if (!enabled) {
      this.ruleChange.emit(undefined);
      return;
    }
    const first = this.candidateFields()[0];
    this.ruleChange.emit({
      fieldId: first?.id ?? '',
      operator: 'equals',
      value: '',
    });
  }

  onFieldChange(fieldId: string) {
    const current = this.rule();
    if (!current) return;
    this.ruleChange.emit({ ...current, fieldId });
  }

  onOperatorChange(operator: 'equals' | 'notEmpty') {
    const current = this.rule();
    if (!current) return;
    this.ruleChange.emit({ ...current, operator });
  }

  onValueChange(value: string) {
    const current = this.rule();
    if (!current) return;
    this.ruleChange.emit({ ...current, value });
  }

  labelFor(field: FormField): string {
    return field.label;
  }

  dependentField = computed(() =>
    this.candidateFields().find((f) => f.id === this.rule()?.fieldId)
  );

  dependentOptions = computed(() => {
    const field = this.dependentField();
    if (!field) return [];
    return field.options ?? [];
  });

  hasOptionValues = computed(() => this.dependentOptions().length > 0);
}
