import { Component, input, output } from '@angular/core';
import { FormField } from '../../../models/field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { bindFieldOptions } from '../../../utils/data-bound-options';
import { getBorderStyle } from '../../../utils/border-style';

@Component({
  selector: 'app-dropdown-list',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './dropdown-list.html',
  styleUrl: './dropdown-list.css',
})
export class DropdownList {
  field = input.required<FormField>();
  value = input<string>('');
  valueChange = output<string>();
  onValueChange = input<(value: string) => void>();

  onSelectionChange(value: string): void {
    this.valueChange.emit(value);
    this.onValueChange()?.(value);
  }

  private boundOptions = bindFieldOptions(this.field);
  options = this.boundOptions.options;
  loading = this.boundOptions.loading;
  error = this.boundOptions.error;

  getBorderStyle(): string {
    return getBorderStyle(this.field().border);
  }
}
