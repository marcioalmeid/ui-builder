import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EntityFieldMapping } from '../../../models/entity-field';
import { FormField } from '../../../models/field';
import { DataCatalogItem } from '../../../catalog/data-catalog.items';
import { DataCatalogPicker } from '../../data-catalog-picker/data-catalog-picker';
import { DataCatalogService } from '../../../services/data-catalog.service';
import { FormService } from '../../../services/form.services';
import {
  filterCompatibleEntityFields,
  formatEntityMappingPath,
} from '../../../utils/entity-field-compat';

@Component({
  selector: 'app-entity-field-mapper',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    DataCatalogPicker,
  ],
  templateUrl: './entity-field-mapper.html',
  styleUrl: './entity-field-mapper.css',
})
export class EntityFieldMapper {
  fieldId = input.required<string>();
  fieldType = input.required<string>();
  inputType = input<string>();
  entityMapping = input<EntityFieldMapping | undefined>();

  fieldUpdate = output<Partial<FormField>>();

  private catalogService = inject(DataCatalogService);
  private formService = inject(FormService);

  enabled = signal(false);
  selectedCatalogId = signal('');
  selectedEntityFieldKey = signal('');

  templateContext = computed(
    () => this.formService.activeTemplate()?.context ?? 'general'
  );

  selectedCatalog = computed(() => {
    const id = this.selectedCatalogId();
    return id ? this.catalogService.getById(id) : undefined;
  });

  compatibleFields = computed(() => {
    const catalog = this.selectedCatalog();
    if (!catalog) return [];

    return filterCompatibleEntityFields(catalog.entityFields, {
      id: this.fieldId(),
      type: this.fieldType(),
      inputType: this.inputType(),
    } as FormField);
  });

  mappingSummary = computed(() => {
    const catalog = this.selectedCatalog();
    const fieldKey = this.selectedEntityFieldKey();
    if (!catalog || !fieldKey) return null;

    const entityField = catalog.entityFields.find((field) => field.key === fieldKey);
    return formatEntityMappingPath(catalog.name, entityField);
  });

  constructor() {
    effect(() => {
      this.fieldId();
      const mapping = this.entityMapping();
      this.enabled.set(Boolean(mapping?.catalogId));
      this.selectedCatalogId.set(mapping?.catalogId ?? '');
      this.selectedEntityFieldKey.set(mapping?.entityFieldKey ?? '');
    });
  }

  onModeChange(enabled: boolean) {
    this.enabled.set(enabled);
    if (!enabled) {
      this.selectedCatalogId.set('');
      this.selectedEntityFieldKey.set('');
      this.fieldUpdate.emit({ entityMapping: undefined });
    }
  }

  onCatalogSelected(item: DataCatalogItem) {
    this.selectedCatalogId.set(item.id);
    this.selectedEntityFieldKey.set('');
    this.emitMapping();
  }

  onEntityFieldChange(fieldKey: string) {
    this.selectedEntityFieldKey.set(fieldKey);
    this.emitMapping();
  }

  private emitMapping() {
    const catalogId = this.selectedCatalogId();
    const entityFieldKey = this.selectedEntityFieldKey();

    if (!catalogId) {
      this.fieldUpdate.emit({ entityMapping: undefined });
      return;
    }

    this.fieldUpdate.emit({
      entityMapping: { catalogId, entityFieldKey },
    });
  }
}
