import { DataBinding } from '../models/data-binding';
import { FormRow } from '../models/form';
import { mergeFieldDataSourceUpdate } from './field-data-source';

/**
 * Collapse legacy shared option lists into per-field catalog connections.
 * Shared lists were removed — one catalog source per dropdown/radio is enough.
 */
export function migrateSharedListsToFieldCatalog(
  rows: FormRow[],
  bindings: DataBinding[]
): { rows: FormRow[]; changed: boolean } {
  if (!bindings.length) {
    const hasStaleIds = rows.some((row) =>
      row.fields.some((field) => Boolean(field.dataBindingId))
    );
    if (!hasStaleIds) {
      return { rows, changed: false };
    }
  }

  const byId = new Map(bindings.map((binding) => [binding.id, binding]));
  let changed = bindings.length > 0;

  const nextRows = rows.map((row) => ({
    ...row,
    fields: row.fields.map((field) => {
      if (!field.dataBindingId) return field;
      changed = true;
      const binding = byId.get(field.dataBindingId);
      if (!binding) {
        return mergeFieldDataSourceUpdate(field, {
          dataBindingId: undefined,
          optionsSource: field.options?.length ? 'static' : field.optionsSource,
        });
      }
      return mergeFieldDataSourceUpdate(field, {
        dataBindingId: undefined,
        optionsSource: 'api',
        dataCatalogId: binding.dataCatalogId ?? field.dataCatalogId,
        dataSource: binding.dataSource ?? field.dataSource,
        options: field.options,
      });
    }),
  }));

  return { rows: nextRows, changed };
}
