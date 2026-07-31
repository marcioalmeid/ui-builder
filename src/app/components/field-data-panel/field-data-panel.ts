import { Component, computed, inject } from '@angular/core';
import { FormService } from '../../services/form.services';
import { getDataBindingMode } from '../../utils/field-data-binding';
import { FormField } from '../../models/field';
import { EntityFieldMapper } from '../field-settings/entity-field-mapper/entity-field-mapper';
import { DataSourceEditor } from '../field-settings/options-source-editor/options-source-editor';

@Component({
  selector: 'app-field-data-panel',
  standalone: true,
  imports: [EntityFieldMapper, DataSourceEditor],
  templateUrl: './field-data-panel.html',
  styleUrl: './field-data-panel.css',
})
export class FieldDataPanel {
  formService = inject(FormService);

  selectedField = computed(() => this.formService.selectedField());

  bindingMode = computed(() => {
    const field = this.selectedField();
    return field ? getDataBindingMode(field.type) : null;
  });

  isEntityMap = computed(() => this.bindingMode() === 'entity-map');

  usesDataSourceEditor = computed(() => {
    const mode = this.bindingMode();
    return mode === 'options' || mode === 'line-items' || mode === 'label';
  });

  updateFieldPartial(fieldId: string, data: Partial<FormField>) {
    this.formService.updateField(fieldId, data);
  }
}
