import { Component } from '@angular/core';
import { FormEditorComponent } from './form-editor.component/form-editor.component';

@Component({
  selector: 'app-main-canvas',
  imports: [FormEditorComponent],
  templateUrl: './main-canvas.html',
  styleUrl: './main-canvas.css',
})
export class MainCanvas {}
