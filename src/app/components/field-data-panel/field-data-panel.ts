import { Component, computed, inject } from '@angular/core';
import { FormService } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import {
  getDataBindingMode,
  getFieldConnectionBadge,
  isFieldBindingConfigured,
} from '../../utils/field-data-binding';
import { FormField } from '../../models/field';
import { EntityFieldMapper } from '../field-settings/entity-field-mapper/entity-field-mapper';
import { DataSourceEditor } from '../field-settings/options-source-editor/options-source-editor';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-field-data-panel',
  standalone: true,
  imports: [EntityFieldMapper, DataSourceEditor, MatIconModule],
  templateUrl: './field-data-panel.html',
  styleUrl: './field-data-panel.css',
})
export class FieldDataPanel {
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);

  selectedField = computed(() => this.formService.selectedField());

  bindingMode = computed(() => {
    const field = this.selectedField();
    return field ? getDataBindingMode(field.type) : null;
  });

  connectionBadge = computed(() => {
    const field = this.selectedField();
    if (!field) return null;

    if (field.entityMapping?.catalogId) {
      const catalog = this.catalogService.getById(field.entityMapping.catalogId);
      const entityField = catalog?.entityFields.find(
        (item) => item.key === field.entityMapping!.entityFieldKey
      );
      return getFieldConnectionBadge(field, catalog?.name, entityField);
    }

    const catalogName = field.dataCatalogId
      ? this.catalogService.getDisplayName(field.dataCatalogId)
      : undefined;
    return getFieldConnectionBadge(field, catalogName);
  });

  isConnected = computed(() => {
    const field = this.selectedField();
    return field ? isFieldBindingConfigured(field) : false;
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
