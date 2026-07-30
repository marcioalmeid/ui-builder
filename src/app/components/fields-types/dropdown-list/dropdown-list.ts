import { Component, input } from '@angular/core';
import { FormField } from '../../../models/field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-dropdown-list',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './dropdown-list.html',
  styleUrl: './dropdown-list.css',
})
export class DropdownList {
  field = input.required<FormField>();
}