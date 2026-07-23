import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RadioOption } from '../../../models/field';

@Component({
  selector: 'app-options-list-editor',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './options-list-editor.html',
})
export class OptionsListEditor {
  options = input.required<RadioOption[]>();
  optionsChange = output<RadioOption[]>();

  add() {
    const newOptions = [...this.options(), { label: '', value: '' }];
    this.optionsChange.emit(newOptions);
  }

  remove(index: number) {
    const newOptions = [...this.options()];
    newOptions.splice(index, 1);
    this.optionsChange.emit(newOptions);
  }

  updateOption(index: number, key: 'label' | 'value', newValue: string) {
    const newOptions = [...this.options()];
    newOptions[index] = { ...newOptions[index], [key]: newValue };
    this.optionsChange.emit(newOptions);
  }
}
