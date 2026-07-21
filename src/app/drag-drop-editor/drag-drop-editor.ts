import { Component,   } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormElementsMenu } from '../components/form-elements-menu/form-elements-menu';
import { MainCanvas } from "../components/main-canvas/main-canvas";
import { FieldSettings } from "../components/field-settings/field-settings";

 

@Component({
  selector: 'app-drag-drop-editor',
  // standalone: true,
  imports: [CommonModule, FormElementsMenu, MainCanvas, FieldSettings],
  templateUrl: './drag-drop-editor.html',
  styleUrls: ['./drag-drop-editor.css'],
})
export class DragDropEditorComponent {
   
}
