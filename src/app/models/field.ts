export interface FieldTypeDefinition {
  id: string;
  type: string;
  label: string;  
   icon: string; 
   defaultConfig: any;
}


export interface FormField {
  id: string;
  type: string;
  label: string;
  icon: string;
  required: boolean;
}
