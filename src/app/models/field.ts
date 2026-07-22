import { Type } from '@angular/core';
export interface FieldTypeDefinition {
  id: string;
  type: string;
  label: string;  
   icon: string; 
   defaultConfig: any;
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
