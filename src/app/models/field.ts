import { Type } from '@angular/core';
import { EntityFieldMapping } from './entity-field';
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

export type OptionsSource = 'static' | 'api';

export interface ApiDataSource {
  url: string;
  method?: 'GET' | 'POST';
  labelKey: string;
  valueKey: string;
  responsePath?: string;
  params?: Record<string, string>;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  hint?: string;
  icon: string;
  required: boolean;
  inputType?: string;
  optionsSource?: OptionsSource;
  dataSource?: ApiDataSource;
  dataCatalogId?: string;
  dataBindingId?: string;
  options?: RadioOption[];
  border?: BorderConfig;
  visibilityRule?: FieldVisibilityRule;
  managementFeePercent?: number;
  entityMapping?: EntityFieldMapping;
  buttonVariant?: 'primary' | 'stroked' | 'basic';
}

export interface FieldVisibilityRule {
  fieldId: string;
  operator: 'equals' | 'notEmpty';
  value?: string;
}

export interface CostBreakdownFee {
  id?: string;
  label: string;
  amount: number;
}

export interface CostBreakdownValue {
  grossBudget: number | '';
  /** Empty string = not set (treated as 0 in calculations). */
  managementFeePercent: number | '';
  additionalFees: CostBreakdownFee[];
}

export interface FieldSettingsDefinition {
  type: 'text'|'checkbox'|'radio'|'select'|'options-list'|'options-source'|'data-source'|'entity-map'|'border'|'number'|'visibility-rule';
  label: string;
  icon?: string;
  key: string;
  options?: OptionItem[];
}

export interface BorderConfig {
  style: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
  width: string;
  color: string;
}

export interface OptionItem {
  value: string;
  label: string;
}