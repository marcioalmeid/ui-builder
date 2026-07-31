import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormField } from '../../../models/field';

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
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
