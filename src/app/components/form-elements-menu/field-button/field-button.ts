import { Component,input } from '@angular/core';
import { FieldTypeDefinition } from '../../../models/field-types-definition.services';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-field-button',
  imports:   [MatIconModule],
  templateUrl: './field-button.html',
  styleUrl: './field-button.css',
})
export class FieldButton {
  field = input.required<FieldTypeDefinition>( );
}
