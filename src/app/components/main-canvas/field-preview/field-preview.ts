import { Component, computed, input, inject, output } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormField } from '../../../models/field';
import { FieldTypeService } from '../../../services/field-types.service';

@Component({
  selector: 'app-field-preview',
  imports: [NgComponentOutlet],
  templateUrl: './field-preview.html',
  styleUrl: './field-preview.css',
})
export class FieldPreview {
  field = input.required<FormField>();
  value = input<unknown>();
  interactive = input(false);
  valueChange = output<unknown>();

  fieldTypeService = inject(FieldTypeService);

  previewComponent = computed(() => {
    const type = this.fieldTypeService.getFieldType(this.field().type);
    return type?.component ?? null;
  });

  componentInputs = computed(() => {
    const inputs: Record<string, unknown> = { field: this.field() };

    if (this.interactive()) {
      inputs['value'] = this.value();
      inputs['onValueChange'] = (value: unknown) => this.valueChange.emit(value);
    }

    return inputs;
  });
}
