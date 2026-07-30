import { Component, input } from '@angular/core';
import { FormField } from '../../../models/field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-date-picker',
  imports: [MatFormFieldModule, MatDatepickerModule, MatInputModule, MatNativeDateModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker {
  field = input.required<FormField>();

  getBorderStyle(): string {
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
