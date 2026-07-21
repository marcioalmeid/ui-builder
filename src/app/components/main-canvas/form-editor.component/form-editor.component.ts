import { Component, inject } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { FormService } from '../../../services/form.services';
import { FieldTypeDefinition } from '../../../models/field';
@Component({
  selector: 'app-form-editor',
  imports: [DragDropModule],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.css',
})
export class FormEditorComponent {

  formService  = inject(FormService);

  onDropInRow(event: CdkDragDrop<string>, rowId: string) {
    console.log('Item dropped in row:', event);
    if(event.previousContainer.data === 'field-selector') {
       const fieldType = event.item.data as FieldTypeDefinition;
       const newField = {
         id: crypto.randomUUID(),
         type: fieldType.type,
         label: fieldType.label,
         icon: fieldType.icon,
        ...fieldType.defaultConfig,
       };
       this.formService.addField(newField, rowId, event.currentIndex);
      return;
    }  
  }
}
