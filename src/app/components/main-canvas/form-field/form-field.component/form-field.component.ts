import { Component, input, inject, computed, output } from '@angular/core';
import { NgComponentOutlet , TitleCasePipe} from '@angular/common';
import { FormField } from '../../../../models/field';
import { FieldTypesService } from '../../../../services/field-types.service';
import { TextField } from '../../../fields-types/text-field/text-field';
import { CheckboxField } from '../../../fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../../../fields-types/radio-field/radio-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-form-field',
  imports: [NgComponentOutlet, TextField, CheckboxField, RadioField, TitleCasePipe, MatButtonModule, MatIconModule],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  field = input.required<FormField>();
  fieldDelete = output<string>();
  fieldTypeService = inject(FieldTypesService);
  previewComponent = computed(() => {
    const type = this.fieldTypeService.getFieldType(this.field().type);
    return type?.component ?? null;
  });

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.fieldDelete.emit(this.field().id);
  }
}
