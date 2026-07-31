import { Component, input, output } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormField } from '../../../models/field';
import { bindFieldOptions } from '../../../utils/data-bound-options';

@Component({
  selector: 'app-radio-field',
  imports: [MatRadioModule, MatProgressSpinnerModule],
  templateUrl: './radio-field.html',
  styleUrl: './radio-field.css',
})
export class RadioField {
  field = input.required<FormField>();
  value = input<string>('');
  valueChange = output<string>();
  onValueChange = input<(value: string) => void>();

  onRadioChange(value: string): void {
    this.valueChange.emit(value);
    this.onValueChange()?.(value);
  }

  private boundOptions = bindFieldOptions(this.field);
  options = this.boundOptions.options;
  loading = this.boundOptions.loading;
  error = this.boundOptions.error;

  getBorderStyle(): string {
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
