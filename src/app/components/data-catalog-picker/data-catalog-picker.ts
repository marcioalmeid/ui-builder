import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { DataCatalogItem } from '../../catalog/data-catalog.items';
import { DataCatalogService } from '../../services/data-catalog.service';

@Component({
  selector: 'app-data-catalog-picker',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './data-catalog-picker.html',
  styleUrl: './data-catalog-picker.css',
})
export class DataCatalogPicker {
  selectedId = input<string>();
  context = input<string>();
  label = input('Data source');

  selectionChange = output<DataCatalogItem>();

  catalogService = inject(DataCatalogService);

  categories = computed(() => this.catalogService.getCategories(this.context()));
  selectedItem = computed(() => {
    const id = this.selectedId() ?? this.localSelection();
    return id ? this.catalogService.getById(id) : undefined;
  });

  localSelection = signal('');

  constructor() {
    effect(() => {
      this.localSelection.set(this.selectedId() ?? '');
    });
  }

  onSelectionChange(catalogId: string) {
    this.localSelection.set(catalogId);
    const item = this.catalogService.getById(catalogId);
    if (item) {
      this.selectionChange.emit(item);
    }
  }
}
