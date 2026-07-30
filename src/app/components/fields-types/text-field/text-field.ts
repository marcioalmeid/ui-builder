import { Component, input } from '@angular/core';
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

  getBorderStyle(): string {
    const border = this.field().border;
    if (!border || border.style === 'none') {
      return 'none';
    }

    return `${border.width} ${border.style} ${border.color}`;
  }
}
