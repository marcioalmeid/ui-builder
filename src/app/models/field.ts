import { Type } from '@angular/core';
export interface FieldTypeDefinition {
  id: string;
  type: string;
  label: string;  
   icon: string; 
   defaultConfig: any;
   component: Type<unknown>;
}


export interface FormField {
  id: string;
  type: string;
  label: string;
  icon: string;
  required: boolean;
  inputType?: string;
}
