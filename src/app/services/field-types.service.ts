import { Injectable } from '@angular/core';
import { FieldTypeDefinition } from '../models/field-types-definition.services';
const TEXT_FIELD_TYPE  = {
  id: 'text',
  type: 'text',
  label: 'Text field',
  icon: 'text_fields',
};

const CHECKBOX_FIELD_TYPE  = {
  id: 'checkbox',
  type: 'checkbox',
  label: 'Checkbox field',
  icon: 'check_box',
};

const RADIO_FIELD_TYPE  = {
  id: 'radio',
  type: 'radio',
  label: 'Radio field',
  icon: 'radio_button_checked',
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
