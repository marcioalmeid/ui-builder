import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormField } from '../../../models/field';
import { getBorderStyle } from '../../../utils/border-style';

@Component({
  selector: 'app-text-field',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
})
export class TextField {
  field = input.required<FormField>();
  value = input<string>('');
  valueChange = output<string>();
  onValueChange = input<(value: string) => void>();

  onInput(event: Event): void {
    const nextValue = (event.target as HTMLInputElement).value;
    this.valueChange.emit(nextValue);
    this.onValueChange()?.(nextValue);
  }

  inputType(): string {
    return this.field().inputType === 'currency' ? 'number' : this.field().inputType || 'text';
  }

  getBorderStyle(): string {
    return getBorderStyle(this.field().border);
  }
}
