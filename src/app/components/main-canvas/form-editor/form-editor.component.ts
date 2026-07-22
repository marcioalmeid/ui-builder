import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../../../services/form.services';
import { FieldTypeDefinition, FormField } from '../../../models/field';
import { FormFieldComponent } from '../form-field/form-field.component/form-field.component';
import { MatIcon } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: 'app-form-editor',
  imports: [DragDropModule, FormFieldComponent, MatIcon, MatButtonModule],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.css',
})
export class FormEditorComponent {
  formService = inject(FormService);

  onDropInRow(event: CdkDragDrop<string>, rowId: string) {

    if (event.previousContainer.data === 'field-selector') {
      const fieldType = event.item.data as FieldTypeDefinition;
      if (!fieldType?.type) {
        return;
      }

      const newField: FormField = {
        id: crypto.randomUUID(),
        type: fieldType.type,
        label: fieldType.label,
        icon: fieldType.icon,
        ...fieldType.defaultConfig,
      };

      this.formService.addField(newField, rowId, event.currentIndex);
      return;
    }

       const dragData = event?.item.data as FormField;
       const previousRowId = event.previousContainer.data as string;
       
       this.formService.moveField(dragData.id, previousRowId, rowId, event.currentIndex);
     
     
  } 


  onDeleteField(fieldId: string, rowId: string) {
    this.formService.deleteField(fieldId, rowId);
  }

  private getDropListData(container: CdkDragDrop<string>['previousContainer']): string {
    return typeof container === 'string' ? container : container.data;
  }
}
