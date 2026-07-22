import { Component, signal, inject } from '@angular/core';
import { FormEditorComponent } from './form-editor/form-editor.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormPreview } from './form-preview/form-preview';
import { MatAnchor } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";
import { FormService } from '../../services/form.services';

@Component({
  selector: 'app-main-canvas',
  imports: [FormEditorComponent, MatButtonToggleModule, FormPreview, MatAnchor, MatIcon],
  templateUrl: './main-canvas.html',
  styleUrl: './main-canvas.css',
})
export class MainCanvas {

  activeTab = signal<'preview' | 'editor'>('editor');
  formService = inject(FormService); 

}
