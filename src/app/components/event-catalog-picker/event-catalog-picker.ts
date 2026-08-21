import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { EventCatalogItem, EVENT_KIND_META, resolveEventKind } from '../../catalog/event-catalog.items';
import { EventCatalogService } from '../../services/event-catalog.service';

@Component({
  selector: 'app-event-catalog-picker',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './event-catalog-picker.html',
  styleUrl: './event-catalog-picker.css',
})
export class EventCatalogPicker {
  selectedId = input<string>();
  context = input<string>();
  label = input('Event');
  disabled = input(false);
  invalid = input(false);

  selectionChange = output<EventCatalogItem>();

  catalogService = inject(EventCatalogService);
  kindMeta = EVENT_KIND_META;
  resolveEventKind = resolveEventKind;

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
