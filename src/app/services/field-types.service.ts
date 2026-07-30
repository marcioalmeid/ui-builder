import { Injectable } from '@angular/core';
import { FieldTypeDefinition } from '../models/field';
import { TextField } from '../components/fields-types/text-field/text-field';
import { CheckboxField } from '../components/fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../components/fields-types/radio-field/radio-field';
import { TextAreaComponent } from '../components/fields-types/text-area/text-area.component';
import { DropdownList } from '../components/fields-types/dropdown-list/dropdown-list';
import { DatePicker } from '../components/fields-types/date-picker/date-picker';

const TEXT_FIELD_TYPE: FieldTypeDefinition  = {
  id: 'text',
  type: 'text',
  label: 'Text field',
  icon: 'text_fields',
  defaultConfig: {
    label: 'Text field',
    placeholder: 'Enter text',
    required: false,
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
  settingsConfig: [
    { type: 'text',  key: 'label', label: 'Label' },
    { type: 'text',  key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox',  key: 'required', label: 'Required' },
    { type: 'select', key: 'inputType', label: 'Input Type',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
      ] },
    { type: 'options-list', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
 component: TextField,
};

const CHECKBOX_FIELD_TYPE: FieldTypeDefinition  =  {
  id: 'checkbox',
  type: 'checkbox',
  label: 'Checkbox',
  icon: 'check_box',
    defaultConfig: {
    label: 'Checkbox',
    required: false,
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
  settingsConfig: [
      { type: 'text',  key: 'label', label: 'Label' },
    { type: 'checkbox',  key: 'required', label: 'Required' },
    { type: 'options-list', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: CheckboxField,
};  

const RADIO_FIELD_TYPE: FieldTypeDefinition  =  {
  id: 'radio',
  type: 'radio',
  label: 'Radio field',
  icon: 'radio_button_checked',
  defaultConfig: {
    label: 'Radio field',
    required: false,
    options: [
      { label: 'Option 1', value: 'option-1' },
      { label: 'Option 2', value: 'option-2' },
      { label: 'Option 3', value: 'option-3' },
    ],
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
   settingsConfig: [
    { type: 'text',  key: 'label', label: 'Label' },
    { type: 'text',  key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox',  key: 'required', label: 'Required' },
    { type: 'select', key: 'inputType', label: 'Input Type',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
      ] },
    { type: 'options-list', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: RadioField,
};

const TEXTAREA_FIELD_TYPE: FieldTypeDefinition = {
  id: 'textarea',
  type: 'textarea',
  label: 'Text area',
  icon: 'format_textdirection_l_to_r',
  defaultConfig: {
    label: 'Text area',
    placeholder: 'Enter text',
    required: false,
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox', key: 'required', label: 'Required' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: TextAreaComponent,
};

const DATE_PICKER_FIELD_TYPE: FieldTypeDefinition  = {
  id: 'datepicker',
  type: 'datepicker',
  label: 'Date Picker',
  icon: 'calendar_month',
  defaultConfig: {
    label: 'Date Picker',
    placeholder: 'Enter date',
    required: false,
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
  settingsConfig: [
    { type: 'text',  key: 'label', label: 'Label' },
    { type: 'text',  key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox',  key: 'required', label: 'Required' },
    { type: 'select', key: 'inputType', label: 'Input Type',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'email', label: 'Email' },
        { value: 'tel', label: 'Phone' },
      ] },
    { type: 'options-list', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
 component: DatePicker,
};

const DROPDOWN_LIST_FIELD_TYPE: FieldTypeDefinition = {
  id: 'dropdown',
  type: 'dropdown',
  label: 'Dropdown List',
  icon: 'arrow_drop_down_circle',
  defaultConfig: {
    label: 'Dropdown List',
    placeholder: 'Select an option',
    required: false,
    options: [
      { label: 'Option 1', value: 'option-1' },
      { label: 'Option 2', value: 'option-2' },
      { label: 'Option 3', value: 'option-3' },
    ],
    border: {
      style: 'none',
      width: '1px',
      color: '#ccc'
    }
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox', key: 'required', label: 'Required' },
    { type: 'options-list', key: 'options', label: 'Options' },
    { type: 'border', key: 'border', label: 'Border' },
  ],
  component: DropdownList,
};

@Injectable({
  providedIn: 'root',
})

export class FieldTypeService {
  fieldTypes= new Map<string, FieldTypeDefinition>([
    ['text', TEXT_FIELD_TYPE],
    ['checkbox', CHECKBOX_FIELD_TYPE],
    ['radio', RADIO_FIELD_TYPE],
    ['textarea', TEXTAREA_FIELD_TYPE],
    ['datepicker', DATE_PICKER_FIELD_TYPE],
    ['dropdown', DROPDOWN_LIST_FIELD_TYPE],
    // ['select', SELECT_FIELD_TYPE],
    // ['number', NUMBER_FIELD_TYPE],
    // ['email', EMAIL_FIELD]
]);
  

  getFieldTypeById(id: string): FieldTypeDefinition | undefined {
    return this.fieldTypes.get(id);
  }

  getFieldType(type: string): FieldTypeDefinition | undefined {
    return  this.fieldTypes.get(type) ;
  }

  getFieldTypes(): FieldTypeDefinition[] {
    return Array.from(this.fieldTypes.values());
  }
}
