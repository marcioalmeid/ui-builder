import { Injectable } from '@angular/core';
import { FieldTypeDefinition } from '../models/field';
import { TextField } from '../components/fields-types/text-field/text-field';
import { CheckboxField } from '../components/fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../components/fields-types/radio-field/radio-field';
const TEXT_FIELD_TYPE  = {
  id: 'text',
  type: 'text',
  label: 'Text field',
  icon: 'text_fields',
  defaultConfig: {
    label: 'Text field',
    placeholder: 'Enter text',
    required: false,
  },
 component: TextField, 
};

const CHECKBOX_FIELD_TYPE  = {
  id: 'checkbox',
  type: 'checkbox',
  label: 'Checkbox field',
  icon: 'check_box',
    defaultConfig: {
    label: 'Checkbox field',
    required: false,
  },
  component: CheckboxField,
};  

const RADIO_FIELD_TYPE  = {
  id: 'radio',
  type: 'radio',
  label: 'Radio field',
  icon: 'radio_button_checked',
    defaultConfig: {
    label: 'Radio field',
    required: false,
  },
  component: RadioField,
};



@Injectable({
  providedIn: 'root',
})



export class FieldTypesService {
  fieldTypes= new Map<string, FieldTypeDefinition>([
    ['text', TEXT_FIELD_TYPE],
    ['checkbox', CHECKBOX_FIELD_TYPE],
    ['radio', RADIO_FIELD_TYPE],
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
