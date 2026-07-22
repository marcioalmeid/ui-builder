import { Component,  inject } from '@angular/core';
import { FormService } from '../../../services/form.services';
import { FieldPreview } from '../field-preview/field-preview';

@Component({
  selector: 'app-form-preview',
  imports: [FieldPreview],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.css',
})
export class FormPreview {
formService = inject(FormService);


}
