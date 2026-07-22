import { Component, input } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormField } from '../../../models/field';
@Component({
  selector: 'app-checkbox-field',
  imports: [CommonModule, MatCheckboxModule, DragDropModule],
  templateUrl: './checkbox-field.html',
  styleUrl: './checkbox-field.css',
})
export class CheckboxField {
    field = input.required<FormField>();

}
