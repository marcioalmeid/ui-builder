import { Component, signal } from '@angular/core';
import { DragDropEditorComponent } from './drag-drop-editor/drag-drop-editor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropEditorComponent, BrowserAnimationsModule, MatButtonModule, MatToolbarModule, MatCardModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ui-builder');
}