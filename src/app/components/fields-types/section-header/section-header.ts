import { Component, computed, input } from '@angular/core';
import { FormField } from '../../../models/field';
import { bindFieldOptions } from '../../../utils/data-bound-options';
import { usesApiDataSource } from '../../../utils/field-data-binding';

@Component({
  selector: 'app-section-header',
  imports: [],
  templateUrl: './section-header.html',
  styleUrl: './section-header.css',
})
export class SectionHeader {
  field = input.required<FormField>();

  usesApi = computed(() => usesApiDataSource(this.field()));

  private boundOptions = bindFieldOptions(this.field);
  options = this.boundOptions.options;
  loading = this.boundOptions.loading;
}
