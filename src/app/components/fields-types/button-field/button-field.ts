import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-button-field',
  imports: [MatButtonModule],
  templateUrl: './button-field.html',
  styleUrl: './button-field.css',
})
export class ButtonField {
  field = input.required<FormField>();

  variant(): 'primary' | 'stroked' | 'basic' {
    const value = this.field().buttonVariant;
    if (value === 'stroked' || value === 'basic') return value;
    return 'primary';
  }
}
