import { Component, signal } from '@angular/core';
import { FormEditorComponent } from './form-editor.component/form-editor.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormPreview } from './form-preview/form-preview';

@Component({
  selector: 'app-main-canvas',
  imports: [FormEditorComponent, MatButtonToggleModule, FormPreview],
  templateUrl: './main-canvas.html',
  styleUrl: './main-canvas.css',
})
export class MainCanvas {

  activeTab = signal<'preview' | 'editor'>('editor');

}
