import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormService } from '../../services/form.services';
import { getAllFields } from '../../utils/template-readiness';
import {
  isListableField,
  resolveListColumns,
  resolveTitleFieldId,
} from '../../utils/layout-contract';
import { MAX_LIST_COLUMNS } from '../../models/list-view';

interface ListFieldRow {
  id: string;
  label: string;
  type: string;
  inColumns: boolean;
  searchable: boolean;
  isTitle: boolean;
  columnIndex: number;
}

@Component({
  selector: 'app-list-view-panel',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatRadioModule,
  ],
  templateUrl: './list-view-panel.html',
  styleUrl: './list-view-panel.css',
})
export class ListViewPanel {
  formService = inject(FormService);
  readonly maxColumns = MAX_LIST_COLUMNS;

  listableFields = computed(() =>
    getAllFields(this.formService.rows()).filter(isListableField)
  );

  titleFieldId = computed(() =>
    resolveTitleFieldId(this.listableFields(), this.formService.listView())
  );

  configuredColumns = computed(() =>
    resolveListColumns(this.formService.listView(), this.listableFields())
  );

  rows = computed((): ListFieldRow[] => {
    const listView = this.formService.listView();
    const titleFieldId = this.titleFieldId();
    const columnIndex = new Map(
      listView.columns.map((column, index) => [column.fieldId, index])
    );

    return this.listableFields().map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      inColumns: columnIndex.has(field.id),
      searchable: listView.searchableFieldIds.includes(field.id),
      isTitle: field.id === titleFieldId,
      columnIndex: columnIndex.get(field.id) ?? -1,
    }));
  });

  columnCount = computed(() => this.configuredColumns().length);

  canAddColumn(fieldId: string): boolean {
    if (this.formService.isReadonly()) return false;
    if (this.columnCount() >= MAX_LIST_COLUMNS) return false;
    return !this.configuredColumns().some((column) => column.fieldId === fieldId);
  }

  setTitleField(fieldId: string) {
    this.formService.setTitleFieldId(fieldId);
  }

  toggleColumn(fieldId: string, enabled: boolean) {
    this.formService.toggleListColumn(fieldId, enabled);
  }

  toggleSearchable(fieldId: string, enabled: boolean) {
    this.formService.toggleSearchableField(fieldId, enabled);
  }

  moveColumn(fieldId: string, direction: 'up' | 'down') {
    this.formService.moveListColumn(fieldId, direction);
  }
}
