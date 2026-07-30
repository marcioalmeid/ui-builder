import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BorderConfig } from '../../../models/field';

@Component({
  selector: 'app-border-config',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, FormsModule],
  templateUrl: './border-config.html',
  styleUrls: ['./border-config.css']
})
export class BorderConfigComponent {
  border = input.required<BorderConfig>();
  borderChange = output<BorderConfig>();

  borderStyles = [
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
    { value: 'groove', label: 'Groove' },
    { value: 'ridge', label: 'Ridge' },
    { value: 'inset', label: 'Inset' },
    { value: 'outset', label: 'Outset' }
  ];

  updateStyle(style: string) {
    // Type assertion to ensure proper type
    const newBorder = { ...this.border(), style: style as BorderConfig['style'] };
    this.borderChange.emit(newBorder);
  }

  updateWidth(width: string) {
    const newBorder = { ...this.border(), width };
    this.borderChange.emit(newBorder);
  }

  updateColor(color: string) {
    const newBorder = { ...this.border(), color };
    this.borderChange.emit(newBorder);
  }
}