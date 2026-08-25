import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { DataBinding } from '../../models/data-binding';
import { DataCatalogItem } from '../../catalog/data-catalog.items';
import { FormService } from '../../services/form.services';
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
    DataCatalogPicker,
  ],
  templateUrl: './data-bindings-panel.html',
  styleUrl: './data-bindings-panel.css',
})
export class DataBindingsPanel {
  formService = inject(FormService);
  catalogService = inject(DataCatalogService);

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
    this.formTargetIds.set([...binding.targetFieldIds]);
    this.statusMessage.set(null);
    this.statusError.set(false);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  onCatalogSelected(item: DataCatalogItem) {
    this.selectedCatalogId.set(item.id);
  }

  toggleTarget(fieldId: string, checked: boolean) {
    const current = this.formTargetIds();
    this.formTargetIds.set(
      checked ? [...current, fieldId] : current.filter((id) => id !== fieldId)
    );
  }

  isTargetSelected(fieldId: string): boolean {
    return this.formTargetIds().includes(fieldId);
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
      this.setStatus('Select at least one dropdown or radio field.', true);
      return;
    }

    const editingId = this.editingId();
    if (editingId === 'new') {
      const binding = this.formService.addDataBinding({
        name: catalogItem.name,
        dataCatalogId: catalogItem.id,
        dataSource: catalogItem.dataSource,
        targetFieldIds: this.formTargetIds(),
      });
      this.trackSubscription(this.formService.refreshDataBinding(binding.id, true).subscribe((result) => {
        if (result.error) {
          this.setStatus(result.error, true);
          return;
        }
        this.setStatus(
          `Shared list "${catalogItem.name}" linked to ${this.formTargetIds().length} field(s).`,
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
      targetFieldIds: this.formTargetIds(),
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
