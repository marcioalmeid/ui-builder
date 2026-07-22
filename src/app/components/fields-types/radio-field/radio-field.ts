import { Component, input } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-radio-field',
  imports: [MatRadioModule],
  templateUrl: './radio-field.html',
  styleUrl: './radio-field.css',
})
export class RadioField {
  field = input.required<FormField>();
}
