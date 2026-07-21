import { Component, signal } from '@angular/core';
import { DragDropEditorComponent } from './drag-drop-editor/drag-drop-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ui-builder');
}