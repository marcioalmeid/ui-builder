import { Component, inject, computed } from '@angular/core';
import { FormService } from '../../services/form.services';
import { FieldTypeService } from '../../services/field-types.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {  MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-field-settings',
  imports: [MatFormFieldModule, MatInput, FormsModule, MatSelectModule, MatCheckboxModule],
  templateUrl: './field-settings.html',
  styleUrl: './field-settings.css',
})
export class FieldSettings {

  formService = inject(FormService);
  fieldTypesService = inject(FieldTypeService);
  fieldSettings = computed(() => {
    const field = this.formService.selectedField();
    if(!field) return [];

    const fieldDef = this.fieldTypesService.getFieldType(field.type);  
    return fieldDef?.settingsConfig ?? [];

  });
  fieldValues = computed(() => {
    const field = this.formService.selectedField();
    if(!field) return {};
    return field as any;
  });

  updateField(selectedFieldId: string, key: string, value: any): void {
  }

}
