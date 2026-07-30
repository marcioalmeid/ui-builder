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

  getBorderStyle(): string {
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
