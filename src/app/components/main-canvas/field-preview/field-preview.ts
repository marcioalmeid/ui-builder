import { Component, input, inject, computed } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormField } from '../../../models/field';
import { FieldTypeService } from '../../../services/field-types.service';



@Component({
  selector: 'app-field-preview',
  imports: [NgComponentOutlet],
  templateUrl: './field-preview.html',
  styleUrl: './field-preview.css',
})
export class FieldPreview {
    field = input.required<FormField>();
    fieldTypeService = inject(FieldTypeService); 

    previewComponent = computed(() => {
    const type = this.fieldTypeService.getFieldType(this.field().type);
    return type?.component ?? null;
  });

}
