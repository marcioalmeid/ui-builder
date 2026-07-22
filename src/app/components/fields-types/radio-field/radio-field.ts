import { Component, input } from '@angular/core';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-radio-field',
  imports: [],
  templateUrl: './radio-field.html',
  styleUrl: './radio-field.css',
})
export class RadioField {
  field = input.required<FormField>();
}
