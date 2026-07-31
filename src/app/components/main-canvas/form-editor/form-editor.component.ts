import { Component, HostListener, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../../../services/form.services';
import { FieldTypeDefinition, FormField } from '../../../models/field';
import { FormFieldComponent } from '../form-field/form-field.component/form-field.component';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-form-editor',
  imports: [DragDropModule, FormFieldComponent, MatIcon, MatButtonModule, MatTooltipModule],
  templateUrl: './form-editor.component.html',
  styleUrl: './form-editor.component.css',
})
export class FormEditorComponent {
  formService = inject(FormService);

  onDropInRow(event: CdkDragDrop<string>, rowId: string) {
    if (this.formService.isReadonly()) return;

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
      this.formService.setSelectedField(newField.id);
      return;
    }

    const dragData = event.item.data as FormField;
    const previousRowId = event.previousContainer.data as string;
    this.formService.moveField(dragData.id, previousRowId, rowId, event.currentIndex);
  }

  onDeleteField(fieldId: string, rowId: string) {
    if (this.formService.isReadonly()) return;
    this.formService.deleteField(fieldId, rowId);
  }

  onCanvasClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.formService.clearSelectedField();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, mat-form-field')) {
      return;
    }

    if (event.key === 'Escape') {
      this.formService.clearSelectedField();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.formService.isReadonly()) return;
      const field = this.formService.selectedField();
      if (!field) {
        return;
      }
      const row = this.formService.findRowByFieldId(field.id);
      if (!row) {
        return;
      }
      event.preventDefault();
      this.formService.deleteField(field.id, row.id);
    }
  }
}
