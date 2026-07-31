import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormService } from '../../services/form.services';
import { FieldTypeService } from '../../services/field-types.service';
import { FormField, FieldSettingsDefinition } from '../../models/field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { OptionsListEditor } from './options-list-editor/options-list-editor';
import { DataSourceEditor } from './options-source-editor/options-source-editor';
import { EntityFieldMapper } from './entity-field-mapper/entity-field-mapper';
import { BorderConfigComponent } from './border-config/border-config';
import {
  FieldSettingsGroupId,
  getDefaultExpandedFieldGroups,
  isFieldSettingsGroupRelevant,
  isSidebarSectionRelevant,
} from '../../utils/template-context-ui';

interface FieldSettingsGroupView {
  id: FieldSettingsGroupId;
  title: string;
  settings: FieldSettingsDefinition[];
  expanded: boolean;
}

const DATA_SETTING_TYPES = new Set([
  'entity-map',
  'data-source',
  'options-source',
  'options-list',
]);

const ADVANCED_SETTING_TYPES = new Set(['border']);

function groupForSettingType(type: FieldSettingsDefinition['type']): FieldSettingsGroupId {
  if (DATA_SETTING_TYPES.has(type)) return 'data';
  if (ADVANCED_SETTING_TYPES.has(type)) return 'advanced';
  return 'general';
}

@Component({
  selector: 'app-field-settings',
  imports: [
    MatFormFieldModule,
    MatInput,
    FormsModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    OptionsListEditor,
    DataSourceEditor,
    EntityFieldMapper,
    BorderConfigComponent,
  ],
  templateUrl: './field-settings.html',
  styleUrl: './field-settings.css',
})
export class FieldSettings {
  formService = inject(FormService);
  fieldTypesService = inject(FieldTypeService);

  expandedGroups = signal<Set<FieldSettingsGroupId>>(new Set(['general']));

  templateContext = computed(() => this.formService.activeTemplate()?.context ?? 'general');

  selectedField = computed(() => this.formService.selectedField());

  fieldSettings = computed(() => {
    const field = this.selectedField();
    if (!field) return [];

    const fieldDef = this.fieldTypesService.getFieldType(field.type);
    return fieldDef?.settingsConfig ?? [];
  });

  settingGroups = computed((): FieldSettingsGroupView[] => {
    const context = this.templateContext();
    const expanded = this.expandedGroups();
    const rulesSupported = isSidebarSectionRelevant('rules', context);
    const allSettings = this.fieldSettings();

    const grouped: Record<FieldSettingsGroupId, FieldSettingsDefinition[]> = {
      general: [],
      data: [],
      advanced: [],
    };

    for (const setting of allSettings) {
      grouped[groupForSettingType(setting.type)].push(setting);
    }

    const defs: Array<{ id: FieldSettingsGroupId; title: string }> = [
      { id: 'general', title: 'General' },
      { id: 'data', title: 'Data' },
      { id: 'advanced', title: 'Advanced' },
    ];

    return defs
      .map((def) => ({ ...def, settings: grouped[def.id] }))
      .filter((def) => def.settings.length > 0)
      .filter((def) => isFieldSettingsGroupRelevant(def.id, context))
      .map((def) => ({
        id: def.id,
        title: def.title,
        settings: def.settings,
        expanded: expanded.has(def.id),
      }));
  });

  showGroupHeaders = computed(() => this.settingGroups().length > 1);

  fieldValues = computed((): FormField & Record<string, unknown> => {
    const field = this.selectedField();
    if (!field) return {} as FormField & Record<string, unknown>;

    const fieldCopy = { ...field };
    if (!fieldCopy.border) {
      fieldCopy.border = { style: 'none', width: '', color: '#000000' };
    }
    return fieldCopy as FormField & Record<string, unknown>;
  });

  constructor() {
    effect(() => {
      const context = this.templateContext();
      this.expandedGroups.set(getDefaultExpandedFieldGroups(context));
    });

    effect(() => {
      const field = this.selectedField();
      if (!field) return;

      const context = this.templateContext();
      const next = getDefaultExpandedFieldGroups(context);
      if (
        this.fieldSettings().some((setting) => DATA_SETTING_TYPES.has(setting.type)) &&
        isFieldSettingsGroupRelevant('data', context)
      ) {
        next.add('data');
      }
      this.expandedGroups.set(next);
    });
  }

  toggleGroup(groupId: FieldSettingsGroupId) {
    if (!this.showGroupHeaders()) return;

    this.expandedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  updateField(fieldId: string, key: string, value: unknown): void {
    this.formService.updateField(fieldId, { [key]: value });
  }

  updateFieldPartial(fieldId: string, data: Partial<FormField>): void {
    this.formService.updateField(fieldId, data);
  }
}
