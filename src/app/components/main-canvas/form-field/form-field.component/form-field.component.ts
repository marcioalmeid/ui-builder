import { Component, input, inject, output } from '@angular/core';
import {  TitleCasePipe} from '@angular/common';
import { FormField } from '../../../../models/field';
import { FieldTypeService } from '../../../../services/field-types.service';
import { TextField } from '../../../fields-types/text-field/text-field';
import { CheckboxField } from '../../../fields-types/checkbox-field/checkbox-field';
import { RadioField } from '../../../fields-types/radio-field/radio-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FieldPreview } from '../../field-preview/field-preview';
@Component({
  selector: 'app-form-field',
  imports: [  TextField, CheckboxField, RadioField, TitleCasePipe, MatButtonModule, MatIconModule, FieldPreview],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  field = input.required<FormField>();
  fieldDelete = output<string>();
  fieldTypeService = inject(FieldTypeService);
   
  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.fieldDelete.emit(this.field().id);
  }
}
