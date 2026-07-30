import { Component, input, output, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-text-area',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.scss']
})
export class TextAreaComponent implements AfterViewInit {
  field = input.required<FormField>();
  valueChange = output<string>();
  @ViewChild('textareaElement', { static: true }) textareaElement!: ElementRef;

  ngAfterViewInit(): void {
    // Load any saved value from localStorage
    const savedValue = localStorage.getItem(`field-value-${this.field().id}`);
    if (savedValue !== null && this.textareaElement) {
      this.textareaElement.nativeElement.value = savedValue;
      this.valueChange.emit(savedValue);
    }
  }

  onInputChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;

    // Save to localStorage immediately
    localStorage.setItem(`field-value-${this.field().id}`, value);

    this.valueChange.emit(value);
  }
}