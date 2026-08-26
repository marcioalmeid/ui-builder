export type ListColumnWidth = 'small' | 'medium' | 'large';

export interface ListViewColumn {
  fieldId: string;
  width?: ListColumnWidth;
  /** When true (default), the column shows a filter input in the task list. */
  filterable?: boolean;
}

/** Shared Layout Contract slice consumed by Admin, List, and Detail. */
export interface ListViewConfig {
  /** Primary identifier shown as the task title in lists. */
  titleFieldId?: string;
  /** Columns rendered in the task table for this template (max 8). */
  columns: ListViewColumn[];
  /** Field ids indexed for full-text search in the task hub. */
  searchableFieldIds: string[];
}

export const MAX_LIST_COLUMNS = 8;

export function createEmptyListView(): ListViewConfig {
  return {
    columns: [],
    searchableFieldIds: [],
  };
}
