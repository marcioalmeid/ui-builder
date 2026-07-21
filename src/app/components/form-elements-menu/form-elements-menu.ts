import { Component, inject } from '@angular/core';
import { FieldTypesService } from '../../services/field-types.service';
import { FieldButton } from './field-button/field-button';

@Component({
  selector: 'app-form-elements-menu',
  // standalone: true,
  imports: [ FieldButton ],
  templateUrl: './form-elements-menu.html',
  styleUrl: './form-elements-menu.css',
})
export class FormElementsMenu {
[x: string]: any;


    fieldTypeService = inject(FieldTypesService);
    fieldTypes = this.fieldTypeService.getFieldTypes() || [];

}
