import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../../../services/form.services';
import { FieldTypeDefinition, FormField } from '../../../models/field';
import { FormFieldComponent } from '../form-field/form-field.component/form-field.component';

@Component({
  selector: 'app-form-editor',
  imports: [DragDropModule, FormFieldComponent],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.css',
})
export class FormEditorComponent {
  formService = inject(FormService);

  onDropInRow(event: CdkDragDrop<string>, rowId: string) {
    const previousContainerData = this.getDropListData(event.previousContainer);
    const targetRowId = this.getDropListData(event.container);

    if (previousContainerData !== 'field-selector') {
      return;
    }

    const fieldType = (event.item as CdkDrag<FieldTypeDefinition>).data;
    if (!fieldType?.type) {
      return;
    }

    const newField: FormField = {
      id: crypto.randomUUID(),
      type: fieldType.type,
      label: fieldType.label,
      icon: fieldType.icon,
      required: fieldType.defaultConfig?.required ?? false,
      ...fieldType.defaultConfig,
    };

    this.formService.addField(newField, targetRowId ?? rowId, event.currentIndex);
  }

  onDeleteField(fieldId: string, rowId: string) {
    this.formService.deleteField(fieldId, rowId);
  }

  private getDropListData(container: CdkDragDrop<string>['previousContainer']): string {
    return typeof container === 'string' ? container : container.data;
  }
}
