import { Component, computed, inject } from '@angular/core';
import { FieldTypeService } from '../../services/field-types.service';
import { FieldButton } from './field-button/field-button';
import { CdkDrag, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-form-elements-menu',
  imports: [FieldButton, DragDropModule],
  templateUrl: './form-elements-menu.html',
  styleUrl: './form-elements-menu.css',
})
export class FormElementsMenu {
  private fieldTypeService = inject(FieldTypeService);

  paletteGroups = computed(() => this.fieldTypeService.getFieldPaletteGroups());

  noDropAllowed(_item: CdkDrag<unknown>) {
    return false;
  }
}
