import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { Subscription } from 'rxjs';
import { DataBinding } from '../../models/data-binding';
import { DataCatalogItem } from '../../catalog/data-catalog.items';
import { FormService, MAX_SHARED_LIST_FIELDS } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import { DataCatalogPicker } from '../data-catalog-picker/data-catalog-picker';

@Component({
  selector: 'app-data-bindings-panel',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    DataCatalogPicker,
  ],
  templateUrl: './data-bindings-panel.html',
  styleUrl: './data-bindings-panel.css',
})
export class DataBindingsPanel {
  formService = inject(FormService);
  catalogService = inject(DataCatalogService);
  readonly maxFields = MAX_SHARED_LIST_FIELDS;

  editingId = signal<string | null>(null);
  selectedCatalogId = signal('');
  formTargetIds = signal<string[]>([]);
  statusMessage = signal<string | null>(null);
  statusError = signal(false);

  bindableFields = computed(() =>
    this.formService
      .rows()
      .flatMap((row) => row.fields)
      .filter((field) => field.type === 'dropdown' || field.type === 'radio')
  );

  /** Field ids already linked to a shared list other than the one being edited. */
  attachedElsewhere = computed(() => {
    const editingId = this.editingId();
    const exceptId = editingId && editingId !== 'new' ? editingId : undefined;
    const map = new Map<string, string>();

    for (const binding of this.formService.dataBindings()) {
      if (binding.id === exceptId) continue;
      const label = this.getBindingLabel(binding);
      for (const fieldId of binding.targetFieldIds) {
        map.set(fieldId, label);
      }
    }

    // Also catch fields that still carry dataBindingId but got out of sync.
    for (const field of this.bindableFields()) {
      if (map.has(field.id)) continue;
      const owner = this.formService.getBindingOwningField(field.id);
      if (owner && owner.id !== exceptId) {
        map.set(field.id, this.getBindingLabel(owner));
      }
    }

    return map;
  });

  selectedTargetId = computed(() => this.formTargetIds()[0] ?? '');

  hasSelectedField = computed(() => this.formTargetIds().length > 0);

  templateDepartment = computed(
    () => this.formService.activeTemplateDepartments()[0] ?? ''
  );

  selectedCatalogItem = computed(() => {
    const id = this.selectedCatalogId();
    return id ? this.catalogService.getById(id) : undefined;
  });

  isCreating = computed(() => this.editingId() === 'new');

  startCreate() {
    this.editingId.set('new');
    this.selectedCatalogId.set('');
    this.formTargetIds.set([]);
    this.statusMessage.set(null);
    this.statusError.set(false);
  }

  startEdit(binding: DataBinding) {
    this.editingId.set(binding.id);
    this.selectedCatalogId.set(binding.dataCatalogId ?? '');
    this.formTargetIds.set(binding.targetFieldIds.slice(0, MAX_SHARED_LIST_FIELDS));
    this.statusMessage.set(null);
    this.statusError.set(false);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  onCatalogSelected(item: DataCatalogItem) {
    this.selectedCatalogId.set(item.id);
  }

  selectTarget(fieldId: string) {
    if (this.isAttachedElsewhere(fieldId)) {
      return;
    }
    this.formTargetIds.set([fieldId]);
  }

  clearTarget() {
    this.formTargetIds.set([]);
  }

  isTargetSelected(fieldId: string): boolean {
    return this.formTargetIds().includes(fieldId);
  }

  isFieldDisabled(fieldId: string): boolean {
    if (this.isAttachedElsewhere(fieldId)) return true;
    // One field per list: once a field is chosen, lock the others.
    if (this.hasSelectedField() && !this.isTargetSelected(fieldId)) return true;
    return false;
  }

  isAttachedElsewhere(fieldId: string): boolean {
    return this.attachedElsewhere().has(fieldId);
  }

  attachedElsewhereLabel(fieldId: string): string | undefined {
    return this.attachedElsewhere().get(fieldId);
  }

  getBindingLabel(binding: DataBinding): string {
    return this.catalogService.getDisplayName(binding.dataCatalogId, binding.name);
  }

  getTargetFieldLabels(binding: DataBinding): string[] {
    return binding.targetFieldIds.map((fieldId) =>
      this.formService.getFieldLabel(fieldId)
    );
  }

  saveBinding() {
    const catalogItem = this.selectedCatalogItem();

    if (!catalogItem) {
      this.setStatus('Choose a catalog source for this shared list.', true);
      return;
    }

    if (this.formTargetIds().length === 0) {
      this.setStatus('Select exactly one dropdown or radio field.', true);
      return;
    }

    const editingId = this.editingId();
    const exceptId = editingId && editingId !== 'new' ? editingId : undefined;
    const { allowed, rejected } = this.formService.filterAvailableTargetFieldIds(
      this.formTargetIds(),
      exceptId
    );

    if (rejected.length > 0) {
      const labels = rejected.map((id) => this.formService.getFieldLabel(id)).join(', ');
      this.setStatus(
        `Already linked elsewhere and skipped: ${labels}. Unlink them first.`,
        true
      );
      this.formTargetIds.set(allowed);
      if (allowed.length === 0) {
        return;
      }
    }

    if (allowed.length !== 1) {
      this.setStatus('A shared list can link to only one field.', true);
      return;
    }

    if (editingId === 'new') {
      const binding = this.formService.addDataBinding({
        name: catalogItem.name,
        dataCatalogId: catalogItem.id,
        dataSource: catalogItem.dataSource,
        targetFieldIds: allowed,
      });
      this.trackSubscription(this.formService.refreshDataBinding(binding.id, true).subscribe((result) => {
        if (result.error) {
          this.setStatus(result.error, true);
          return;
        }
        this.setStatus(
          `Shared list "${catalogItem.name}" linked to ${this.formService.getFieldLabel(allowed[0])}.`,
          false
        );
        this.editingId.set(null);
      }));
      return;
    }

    if (!editingId) {
      return;
    }

    this.formService.updateDataBinding(editingId, {
      name: catalogItem.name,
      dataCatalogId: catalogItem.id,
      dataSource: catalogItem.dataSource,
      targetFieldIds: allowed,
    });

    this.trackSubscription(this.formService.refreshDataBinding(editingId, true).subscribe((result) => {
      if (result.error) {
        this.setStatus(result.error, true);
        return;
      }
      this.setStatus(`Shared list "${catalogItem.name}" updated.`, false);
      this.editingId.set(null);
    }));
  }

  refreshBinding(bindingId: string) {
    this.trackSubscription(this.formService.refreshDataBinding(bindingId, true).subscribe((result) => {
      if (result.error) {
        this.setStatus(result.error, true);
        return;
      }
      this.setStatus(`Reloaded ${result.options.length} option(s).`, false);
    }));
  }

  deleteBinding(bindingId: string) {
    this.formService.deleteDataBinding(bindingId);
    if (this.editingId() === bindingId) {
      this.editingId.set(null);
    }
  }

  private setStatus(message: string, isError: boolean) {
    this.statusMessage.set(message);
    this.statusError.set(isError);
  }

  private subscriptions = new Set<Subscription>();

  private trackSubscription(sub: Subscription) {
    this.subscriptions.add(sub);
    sub.add(() => this.subscriptions.delete(sub));
  }

  ngOnDestroy() {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();
  }
}
