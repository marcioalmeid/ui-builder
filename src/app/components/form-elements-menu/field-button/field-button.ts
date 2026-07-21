import { Component,input } from '@angular/core';
import { FieldTypeDefinition } from '../../../models/field';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-field-button',
  imports:   [MatIconModule, DragDropModule],
  templateUrl: './field-button.html',
  styleUrl: './field-button.css',
})
export class FieldButton {
  field = input.required<FieldTypeDefinition>( );
}
