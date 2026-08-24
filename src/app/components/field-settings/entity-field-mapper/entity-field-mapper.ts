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
  private lastSyncedFieldId = '';

  firstDepartment = computed(
    () => this.formService.activeTemplate()?.departments?.[0] ?? ''
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
    const persisted = this.entityMapping();
    const catalogId = persisted?.catalogId ?? this.selectedCatalogId();
    const fieldKey = persisted?.entityFieldKey || this.selectedEntityFieldKey();
    if (!catalogId || !fieldKey) return null;

    const catalog = this.catalogService.getById(catalogId);
    const entityField = catalog?.entityFields.find((field) => field.key === fieldKey);
    return formatEntityMappingPath(catalog?.name ?? catalogId, entityField);
  });

  isPersisted = computed(() => {
    const persisted = this.entityMapping();
    return Boolean(persisted?.catalogId && persisted?.entityFieldKey);
  });

  isReadonly = computed(() => this.formService.isReadonly());

  constructor() {
    effect(() => {
      const fieldId = this.fieldId();
      const mapping = this.entityMapping();

      if (fieldId !== this.lastSyncedFieldId) {
        this.lastSyncedFieldId = fieldId;
        this.enabled.set(Boolean(mapping?.catalogId));
        this.selectedCatalogId.set(mapping?.catalogId ?? '');
        this.selectedEntityFieldKey.set(mapping?.entityFieldKey ?? '');
        return;
      }

      if (mapping?.catalogId) {
        this.enabled.set(true);
        this.selectedCatalogId.set(mapping.catalogId);
        if (mapping.entityFieldKey) {
          this.selectedEntityFieldKey.set(mapping.entityFieldKey);
        }
      }
    });
  }

  onModeChange(enabled: boolean) {
    this.enabled.set(enabled);
    if (!enabled) {
      this.selectedCatalogId.set('');
      this.selectedEntityFieldKey.set('');
      this.persistMapping(undefined);
    }
  }

  onCatalogSelected(item: DataCatalogItem) {
    this.selectedCatalogId.set(item.id);
    this.selectedEntityFieldKey.set('');
    this.persistMapping({ catalogId: item.id, entityFieldKey: '' });
  }

  onEntityFieldChange(fieldKey: string) {
    this.selectedEntityFieldKey.set(fieldKey);
    const catalogId = this.selectedCatalogId();
    if (!catalogId) return;
    this.persistMapping({ catalogId, entityFieldKey: fieldKey });
  }

  private persistMapping(mapping: EntityFieldMapping | undefined) {
    if (this.formService.isReadonly()) {
      return;
    }

    const update: Partial<FormField> = { entityMapping: mapping };
    this.formService.updateField(this.fieldId(), update);
    this.fieldUpdate.emit(update);
  }
}
