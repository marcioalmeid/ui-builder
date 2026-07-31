import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormField } from '../../../../models/field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldPreview } from '../../field-preview/field-preview';
import { FormService } from '../../../../services/form.services';
import { DataCatalogService } from '../../../../services/data-catalog.service';
import { getFieldIssues } from '../../../../utils/field-issues';
import { getFieldConnectionBadge } from '../../../../utils/field-data-binding';

@Component({
  selector: 'app-form-field',
  imports: [
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FieldPreview,
    DragDropModule,
  ],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  field = input.required<FormField>();
  readonly = input(false);
  fieldDelete = output<string>();
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);
  whileDragging = signal(false);

  isSelected = computed(
    () => this.formService.selectedField()?.id === this.field().id
  );

  issues = computed(() => getFieldIssues(this.field()));

  connectionBadge = computed(() => {
    const currentField = this.field();
    const catalogId =
      currentField.entityMapping?.catalogId ?? currentField.dataCatalogId;
    const catalogName = catalogId
      ? this.catalogService.getDisplayName(catalogId)
      : undefined;
    return getFieldConnectionBadge(currentField, catalogName);
  });

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.fieldDelete.emit(this.field().id);
  }

  onSelectClick() {
    this.formService.setSelectedField(this.field().id);
  }

  onSelectKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelectClick();
    }
  }
}
