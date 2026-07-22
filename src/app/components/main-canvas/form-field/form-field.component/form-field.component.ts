import { Component, input,inject } from '@angular/core';
import { FormField } from '../../../../models/field';
import { FieldTypesService } from '../../../../services/field-types.service';
import { computed } from '@angular/core';
import { NgComponentOutlet } from "../../../../../../node_modules/@angular/common/types/_common_module-chunk";
@Component({
  selector: 'app-form-field',
  imports: [NgComponentOutlet],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  field = input.required<FormField>( );
  fieldTypeService = inject(FieldTypesService);
  previewComponent = computed(() => {
    const type = this.fieldTypeService.getFieldType(this.field().type);
    return type?.component ?? null;
  });

}
