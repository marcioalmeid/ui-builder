import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-checkbox-field',
  imports: [CommonModule, MatCheckboxModule],
  templateUrl: './checkbox-field.html',
  styleUrl: './checkbox-field.css',
})
export class CheckboxField {
  field = input.required<FormField>();
  value = input<boolean>(false);
  valueChange = output<boolean>();
  onValueChange = input<(value: boolean) => void>();

  onCheckedChange(checked: boolean): void {
    this.valueChange.emit(checked);
    this.onValueChange()?.(checked);
  }

  getBorderStyle(): string {
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
