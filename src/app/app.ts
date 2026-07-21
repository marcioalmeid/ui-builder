import { Component, signal } from '@angular/core';
import { DragDropEditorComponent } from './drag-drop-editor/drag-drop-editor';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropEditorComponent, MatToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ui-builder');
}