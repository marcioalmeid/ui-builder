import { Injectable } from '@angular/core';
import { FieldTypeDefinition } from '../models/field';
const TEXT_FIELD_TYPE  = {
  id: 'text',
  type: 'text',
  label: 'Text field',
  icon: 'text_fields',
  defaultConfig: {
    label: 'Text field',
    placeholder: 'Enter text',
    required: false,
  }
};

const CHECKBOX_FIELD_TYPE  = {
  id: 'checkbox',
  type: 'checkbox',
  label: 'Checkbox field',
  icon: 'check_box',
    defaultConfig: {
    label: 'Checkbox field',
    required: false,
  }
};  

const RADIO_FIELD_TYPE  = {
  id: 'radio',
  type: 'radio',
  label: 'Radio field',
  icon: 'radio_button_checked',
    defaultConfig: {
    label: 'Radio field',
    required: false,
  }
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
  

  getFieldTypes(): FieldTypeDefinition[] | undefined {
    return Array.from(this.fieldTypes.values());
  }

  
}
