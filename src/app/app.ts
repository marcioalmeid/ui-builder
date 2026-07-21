import { Component, signal } from '@angular/core';
import { DragDropEditorComponent } from './drag-drop-editor/drag-drop-editor';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FormElementsMenu } from './components/form-elements-menu/form-elements-menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropEditorComponent, FormElementsMenu, MatToolbarModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('ui-builder');
}