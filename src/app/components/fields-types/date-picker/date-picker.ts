import { Component, input, output } from '@angular/core';
import { FormField } from '../../../models/field';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { getBorderStyle } from '../../../utils/border-style';

@Component({
  selector: 'app-date-picker',
  imports: [MatFormFieldModule, MatDatepickerModule, MatInputModule, MatNativeDateModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker {
  field = input.required<FormField>();
  value = input<string>('');
  valueChange = output<string>();
  onValueChange = input<(value: string) => void>();

  onDateChange(event: MatDatepickerInputEvent<Date>): void {
    const date = event.value;
    if (!date) {
      this.emitValue('');
      return;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.emitValue(`${year}-${month}-${day}`);
  }

  private emitValue(value: string): void {
    this.valueChange.emit(value);
    this.onValueChange()?.(value);
  }

  getBorderStyle(): string {
    return getBorderStyle(this.field().border);
  }
}
