import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BuilderSidebar } from '../components/builder-sidebar/builder-sidebar';
import { MainCanvas } from "../components/main-canvas/main-canvas";
import { FieldSettings } from "../components/field-settings/field-settings";
import { FieldDataPanel } from '../components/field-data-panel/field-data-panel';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../services/form.services';
import { WelcomeDialog } from '../components/welcome-dialog/welcome-dialog';

const WELCOME_KEY = 'ui-builder-welcome-seen';

@Component({
  selector: 'app-drag-drop-editor',
  imports: [
    CommonModule,
    RouterLink,
    BuilderSidebar,
    MainCanvas,
    FieldSettings,
    FieldDataPanel,
    DragDropModule,
    MatButtonModule,
    MatIcon,
    MatDialogModule,
  ],
  templateUrl: './drag-drop-editor.html',
  styleUrls: ['./drag-drop-editor.css'],
})
export class DragDropEditorComponent implements OnInit {
  formService = inject(FormService);
  private dialog = inject(MatDialog);

  isDataBindingContext = computed(
    () => this.formService.activeSetupStep() === 'data'
  );

  showRightPanel = computed(
    () => this.isDataBindingContext() || Boolean(this.formService.selectedField())
  );

  ngOnInit() {
    if (!localStorage.getItem(WELCOME_KEY)) {
      this.dialog.open(WelcomeDialog, { width: '480px' });
      localStorage.setItem(WELCOME_KEY, '1');
    }
  }

  undo() {
    this.formService.undo();
  }

  redo() {
    this.formService.redo();
  }
}
