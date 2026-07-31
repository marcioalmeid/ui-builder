import { Component, computed, input, inject, output } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormField } from '../../../models/field';
import { FieldTypeService } from '../../../services/field-types.service';
import { ButtonField } from '../../fields-types/button-field/button-field';
import { CheckboxField } from '../../fields-types/checkbox-field/checkbox-field';
import { CostBreakdown } from '../../fields-types/cost-breakdown/cost-breakdown';
import { DatePicker } from '../../fields-types/date-picker/date-picker';
import { DropdownList } from '../../fields-types/dropdown-list/dropdown-list';
import { RadioField } from '../../fields-types/radio-field/radio-field';
import { SectionHeader } from '../../fields-types/section-header/section-header';
import { TextAreaComponent } from '../../fields-types/text-area/text-area.component';
import { TextField } from '../../fields-types/text-field/text-field';

/** Ensures dynamic field components stay in the bundle for NgComponentOutlet. */
const FIELD_PREVIEW_IMPORTS = [
  TextField,
  TextAreaComponent,
  CheckboxField,
  RadioField,
  DatePicker,
  DropdownList,
  SectionHeader,
  CostBreakdown,
  ButtonField,
];

@Component({
  selector: 'app-field-preview',
  imports: [NgComponentOutlet, ...FIELD_PREVIEW_IMPORTS],
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
