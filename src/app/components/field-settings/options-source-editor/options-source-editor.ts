import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApiDataSource, FormField, OptionsSource, RadioOption } from '../../../models/field';
import { DataCatalogItem } from '../../../catalog/data-catalog.items';
import { DataSourceService } from '../../../services/data-source.service';
import { DataCatalogPicker } from '../../data-catalog-picker/data-catalog-picker';
import { FormService } from '../../../services/form.services';
import { DataCatalogService } from '../../../services/data-catalog.service';
import { OptionsListEditor } from '../options-list-editor/options-list-editor';
import { getDataBindingMode } from '../../../utils/field-data-binding';

type OptionsSourceMode = 'static' | 'field-catalog' | 'shared-list';

@Component({
  selector: 'app-data-source-editor',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    OptionsListEditor,
    DataCatalogPicker,
  ],
  templateUrl: './options-source-editor.html',
  styleUrl: './options-source-editor.css',
})
export class DataSourceEditor {
  fieldId = input.required<string>();
  fieldType = input.required<string>();
  options = input<RadioOption[]>([]);
  optionsSource = input<OptionsSource>('static');
  dataSource = input<ApiDataSource>();
  dataCatalogId = input<string>();
  dataBindingId = input<string>();

  fieldUpdate = output<Partial<FormField>>();

  private dataSourceService = inject(DataSourceService);
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);

  bindingMode = computed(() => getDataBindingMode(this.fieldType()));
  showStaticOptions = computed(() => this.bindingMode() === 'options');

  modeHint = computed(() => {
    switch (this.bindingMode()) {
      case 'line-items':
        return 'Catalog rows pre-fill fee lines in the cost breakdown.';
      case 'label':
        return 'Connect a catalog to show linked data on this section.';
      default:
        return 'Connect a catalog source to this field.';
    }
  });

  sourceMode = computed((): OptionsSourceMode => {
    if (!this.showStaticOptions()) {
      return this.optionsSource() === 'api' ? 'field-catalog' : 'static';
    }
    if (this.dataBindingId()) return 'shared-list';
    if (this.optionsSource() === 'api') return 'field-catalog';
    return 'static';
  });

  sharedLists = computed(() => this.formService.dataBindings());

  activeSharedList = computed(() => {
    const bindingId = this.dataBindingId();
    if (!bindingId) return undefined;
    return this.sharedLists().find((binding) => binding.id === bindingId);
  });

  templateContext = computed(
    () => this.formService.activeTemplate()?.context ?? 'general'
  );

  loading = signal(false);
  statusMessage = signal<string | null>(null);
  statusError = signal(false);
  selectedCatalogId = signal<string>('');

  constructor() {
    effect(() => {
      this.fieldId();
      this.selectedCatalogId.set(this.dataCatalogId() ?? '');
      this.statusMessage.set(null);
      this.statusError.set(false);
    });
  }

  onModeChange(mode: OptionsSourceMode) {
    this.statusMessage.set(null);
    this.statusError.set(false);

    if (mode === 'static') {
      if (this.dataBindingId()) {
        this.formService.unlinkFieldFromSharedList(this.fieldId());
      }

      const update: Partial<FormField> = {
        optionsSource: 'static',
        dataCatalogId: undefined,
        dataSource: undefined,
        dataBindingId: undefined,
      };

      if (this.showStaticOptions()) {
        update.options = this.options().length
          ? this.options()
          : [{ label: 'Option 1', value: 'option-1' }];
      }

      this.fieldUpdate.emit(update);
      return;
    }

    if (mode === 'field-catalog') {
      if (this.dataBindingId()) {
        this.formService.unlinkFieldFromSharedList(this.fieldId());
      }
      this.fieldUpdate.emit({ optionsSource: 'api', dataBindingId: undefined });
      return;
    }

    if (mode === 'shared-list' && this.sharedLists().length === 1) {
      this.onSharedListSelected(this.sharedLists()[0].id);
    }
  }

  onStaticOptionsChange(options: RadioOption[]) {
    this.fieldUpdate.emit({
      optionsSource: 'static',
      dataCatalogId: undefined,
      options,
    });
  }

  onCatalogSelected(item: DataCatalogItem) {
    this.selectedCatalogId.set(item.id);
    this.loading.set(true);
    this.statusMessage.set(null);
    this.statusError.set(false);

    this.dataSourceService.fetchOptions(item.dataSource, true).subscribe({
      next: ({ options, error }) => {
        this.loading.set(false);

        if (error) {
          this.statusMessage.set(error);
          this.statusError.set(true);
          return;
        }

        this.statusMessage.set(`Loaded ${options.length} options for this field only.`);
        this.statusError.set(false);

        this.fieldUpdate.emit({
          optionsSource: 'api',
          dataCatalogId: item.id,
          dataSource: item.dataSource,
          dataBindingId: undefined,
          options,
        });
      },
    });
  }

  onSharedListSelected(bindingId: string) {
    if (!bindingId) return;

    this.loading.set(true);
    this.statusMessage.set(null);
    this.statusError.set(false);

    this.formService.linkFieldToSharedList(this.fieldId(), bindingId).subscribe({
      next: ({ options, error }) => {
        this.loading.set(false);

        if (error) {
          this.statusMessage.set(error);
          this.statusError.set(true);
          return;
        }

        const binding = this.formService.dataBindings().find((item) => item.id === bindingId);
        const name = binding
          ? this.catalogService.getDisplayName(binding.dataCatalogId, binding.name)
          : 'Shared list';

        this.statusMessage.set(`Linked to shared list "${name}" (${options.length} options).`);
        this.statusError.set(false);
      },
    });
  }

  openSharedListsPanel() {
    this.formService.focusSidebarSection('data');
  }

  getSharedListLabel(bindingId: string): string {
    const binding = this.sharedLists().find((item) => item.id === bindingId);
    if (!binding) return bindingId;
    return this.catalogService.getDisplayName(binding.dataCatalogId, binding.name);
  }
}
