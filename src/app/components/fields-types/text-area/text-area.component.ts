import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormField } from '../../../models/field';
import { getBorderStyle } from '../../../utils/border-style';

@Component({
  selector: 'app-text-area',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.scss'],
})
export class TextAreaComponent {
  field = input.required<FormField>();
  value = input<string>('');
  valueChange = output<string>();
  onValueChange = input<(value: string) => void>();

  onInputChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(value);
    this.onValueChange()?.(value);
  }

  getBorderStyle(): string {
    return getBorderStyle(this.field().border);
  }
}
