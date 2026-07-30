
import { Component, input, output } from '@angular/core';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-text-area',
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.scss']
})
export class TextAreaComponent {






  field = input.required<FormField>();
  valueChange = output<string>();

  onInputChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(value);
  }
}