import { Injectable } from '@angular/core';
import { FieldTypeDefinition } from '../models/field';
import { TextField } from '../components/fields-types/text-field/text-field';
import { CheckboxField } from '../components/fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../components/fields-types/radio-field/radio-field';
import { TextAreaComponent } from '../components/fields-types/text-area/text-area.component';
import { DropdownList } from '../components/fields-types/dropdown-list/dropdown-list';
import { DatePicker } from '../components/fields-types/date-picker/date-picker';
import { SectionHeader } from '../components/fields-types/section-header/section-header';
import { CostBreakdown } from '../components/fields-types/cost-breakdown/cost-breakdown';
import { ButtonField } from '../components/fields-types/button-field/button-field';

const HINT_SETTING = { type: 'text' as const, key: 'hint', label: 'Help text' };
const ENTITY_MAP_SETTING = {
  type: 'entity-map' as const,
  key: 'entityMapping',
  label: 'Entity mapping',
};

const TEXT_FIELD_TYPE: FieldTypeDefinition = {
  id: 'text',
  type: 'text',
  label: 'Text field',
  icon: 'text_fields',
  defaultConfig: {
    label: 'Text field',
    placeholder: 'Enter text',
    required: false,
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    {
      type: 'select',
      key: 'inputType',
      label: 'Input Type',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'currency', label: 'Currency ($)' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
      ],
    },
    ENTITY_MAP_SETTING,
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: TextField,
};

const CHECKBOX_FIELD_TYPE: FieldTypeDefinition = {
  id: 'checkbox',
  type: 'checkbox',
  label: 'Checkbox',
  icon: 'check_box',
  defaultConfig: {
    label: 'Checkbox',
    required: false,
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    ENTITY_MAP_SETTING,
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: CheckboxField,
};

const RADIO_FIELD_TYPE: FieldTypeDefinition = {
  id: 'radio',
  type: 'radio',
  label: 'Radio field',
  icon: 'radio_button_checked',
  defaultConfig: {
    label: 'Radio field',
    required: false,
    optionsSource: 'static',
    options: [
      { label: 'Option 1', value: 'option-1' },
      { label: 'Option 2', value: 'option-2' },
    ],
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    { type: 'data-source', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: RadioField,
};

const TEXTAREA_FIELD_TYPE: FieldTypeDefinition = {
  id: 'textarea',
  type: 'textarea',
  label: 'Text area',
  icon: 'notes',
  defaultConfig: {
    label: 'Text area',
    placeholder: 'Enter text',
    required: false,
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    ENTITY_MAP_SETTING,
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: TextAreaComponent,
};

const DATE_PICKER_FIELD_TYPE: FieldTypeDefinition = {
  id: 'datepicker',
  type: 'datepicker',
  label: 'Date picker',
  icon: 'calendar_month',
  defaultConfig: {
    label: 'Date picker',
    placeholder: 'mm/dd/yyyy',
    required: false,
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    ENTITY_MAP_SETTING,
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: DatePicker,
};

const DROPDOWN_LIST_FIELD_TYPE: FieldTypeDefinition = {
  id: 'dropdown',
  type: 'dropdown',
  label: 'Dropdown',
  icon: 'arrow_drop_down_circle',
  defaultConfig: {
    label: 'Dropdown',
    placeholder: 'Select an option',
    required: false,
    optionsSource: 'static',
    options: [
      { label: 'Option 1', value: 'option-1' },
      { label: 'Option 2', value: 'option-2' },
    ],
    border: { style: 'none', width: '1px', color: '#ccc' },
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    HINT_SETTING,
    { type: 'checkbox', key: 'required', label: 'Required' },
    { type: 'data-source', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: DropdownList,
};

const DATA_SOURCE_SETTING = {
  type: 'data-source' as const,
  key: 'dataSource',
  label: 'Data source',
};

const SECTION_HEADER_FIELD_TYPE: FieldTypeDefinition = {
  id: 'section-header',
  type: 'section-header',
  label: 'Section header',
  icon: 'view_agenda',
  defaultConfig: {
    label: 'Section title',
    hint: '',
    required: false,
    optionsSource: 'static',
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Section title' },
    { type: 'text', key: 'hint', label: 'Subtitle (optional)' },
    DATA_SOURCE_SETTING,
  ],
  component: SectionHeader,
};

const COST_BREAKDOWN_FIELD_TYPE: FieldTypeDefinition = {
  id: 'cost-breakdown',
  type: 'cost-breakdown',
  label: 'Cost breakdown',
  icon: 'calculate',
  defaultConfig: {
    label: 'Cost breakdown',
    hint: 'Calculated net ad spend from gross budget and fees',
    required: false,
    optionsSource: 'static',
    managementFeePercent: 15,
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Block title' },
    HINT_SETTING,
    { type: 'number', key: 'managementFeePercent', label: 'Default management fee (%)' },
    { type: 'checkbox', key: 'required', label: 'Gross budget required' },
    DATA_SOURCE_SETTING,
  ],
  component: CostBreakdown,
};

const BUTTON_FIELD_TYPE: FieldTypeDefinition = {
  id: 'button',
  type: 'button',
  label: 'Button',
  icon: 'touch_app',
  defaultConfig: {
    label: 'Button',
    hint: '',
    required: false,
    buttonVariant: 'primary',
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Button label' },
    HINT_SETTING,
    {
      type: 'select',
      key: 'buttonVariant',
      label: 'Style',
      options: [
        { value: 'primary', label: 'Primary (filled)' },
        { value: 'stroked', label: 'Outlined' },
        { value: 'basic', label: 'Text' },
      ],
    },
  ],
  component: ButtonField,
};

export interface FieldPaletteGroup {
  id: string;
  label: string;
  types: FieldTypeDefinition[];
}

const INPUT_FIELD_TYPES: FieldTypeDefinition[] = [
  TEXT_FIELD_TYPE,
  TEXTAREA_FIELD_TYPE,
  CHECKBOX_FIELD_TYPE,
  RADIO_FIELD_TYPE,
  DATE_PICKER_FIELD_TYPE,
  DROPDOWN_LIST_FIELD_TYPE,
];

const LAYOUT_FIELD_TYPES: FieldTypeDefinition[] = [
  BUTTON_FIELD_TYPE,
  SECTION_HEADER_FIELD_TYPE,
  COST_BREAKDOWN_FIELD_TYPE,
];

const PALETTE_FIELD_TYPES: FieldTypeDefinition[] = [
  ...LAYOUT_FIELD_TYPES,
  ...INPUT_FIELD_TYPES,
];

@Injectable({
  providedIn: 'root',
})
export class FieldTypeService {
  fieldTypes = new Map<string, FieldTypeDefinition>([
    ['text', TEXT_FIELD_TYPE],
    ['checkbox', CHECKBOX_FIELD_TYPE],
    ['radio', RADIO_FIELD_TYPE],
    ['textarea', TEXTAREA_FIELD_TYPE],
    ['datepicker', DATE_PICKER_FIELD_TYPE],
    ['dropdown', DROPDOWN_LIST_FIELD_TYPE],
    ['section-header', SECTION_HEADER_FIELD_TYPE],
    ['button', BUTTON_FIELD_TYPE],
    ['cost-breakdown', COST_BREAKDOWN_FIELD_TYPE],
  ]);

  getFieldTypeById(id: string): FieldTypeDefinition | undefined {
    return this.fieldTypes.get(id);
  }

  getFieldType(type: string): FieldTypeDefinition | undefined {
    return this.fieldTypes.get(type);
  }

  getFieldTypes(): FieldTypeDefinition[] {
    return Array.from(this.fieldTypes.values());
  }

  getFieldPaletteGroups(): FieldPaletteGroup[] {
    return [
      { id: 'layout', label: 'Layout & actions', types: LAYOUT_FIELD_TYPES },
      { id: 'inputs', label: 'Input fields', types: INPUT_FIELD_TYPES },
    ];
  }

  /** Flat palette order used in the Fields sidebar (inputs, then layout). */
  getFieldPaletteTypes(): FieldTypeDefinition[] {
    return PALETTE_FIELD_TYPES;
  }
}
