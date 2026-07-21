import { Component, inject } from '@angular/core';
import { FieldTypesService } from '../../services/field-types.service';
import { FieldButton } from './field-button/field-button';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-form-elements-menu',
  // standalone: true,
  imports: [ FieldButton , DragDropModule],
  templateUrl: './form-elements-menu.html',
  styleUrl: './form-elements-menu.css',
})
export class FormElementsMenu {
[x: string]: any;


    fieldTypeService = inject(FieldTypesService);
    fieldTypes = this.fieldTypeService.getFieldTypes() || [];

}
