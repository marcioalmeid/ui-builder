import { Type } from '@angular/core';
export interface FieldTypeDefinition {
  id: string;
  type: string;
  label: string;  
   icon: string; 
   defaultConfig: any;
   settingsConfig: FieldSettingsDefinition[];
   component: Type<unknown>;
}


export interface RadioOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  icon: string;
  required: boolean;
  inputType?: string;
  options?: RadioOption[];
}

export interface FieldSettingsDefinition {
  type: 'text'|'checkbox'|'radio'|'select';
  label: string;
  icon?: string;
  key: string;
  options?: OptionItem[];
}

export interface OptionItem {
  value: string;
  label: string;
}