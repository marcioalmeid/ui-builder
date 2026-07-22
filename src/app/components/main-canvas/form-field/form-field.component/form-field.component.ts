import { Component, input, inject, computed } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormField } from '../../../../models/field';
import { FieldTypesService } from '../../../../services/field-types.service';
import { TextField } from '../../../fields-types/text-field/text-field';
import { CheckboxField } from '../../../fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../../../fields-types/radio-field/radio-field';

@Component({
  selector: 'app-form-field',
  imports: [NgComponentOutlet, TextField, CheckboxField, RadioField],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  field = input.required<FormField>();
  fieldTypeService = inject(FieldTypesService);
  previewComponent = computed(() => {
    const type = this.fieldTypeService.getFieldType(this.field().type);
    return type?.component ?? null;
  });
}
