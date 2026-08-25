import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BuilderSidebar } from '../components/builder-sidebar/builder-sidebar';
import { MainCanvas } from "../components/main-canvas/main-canvas";
import { FieldSettings } from "../components/field-settings/field-settings";
import { FieldDataPanel } from '../components/field-data-panel/field-data-panel';
import { TemplateSelector } from '../components/template-selector/template-selector';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../services/form.services';
import { WelcomeDialog } from '../components/welcome-dialog/welcome-dialog';

const WELCOME_KEY = 'ui-builder-welcome-seen';

@Component({
  selector: 'app-drag-drop-editor',
  imports: [
    CommonModule,
    BuilderSidebar,
    MainCanvas,
    FieldSettings,
    FieldDataPanel,
    TemplateSelector,
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isDataBindingContext = computed(
    () => this.formService.activeSetupStep() === 'data'
  );

  showRightPanel = computed(
    () => this.isDataBindingContext() || Boolean(this.formService.selectedField())
  );

  ngOnInit() {
    this.route.paramMap.subscribe({
        next: (params) => {
          const templateId = params.get('templateId');
          if (!templateId) {
            const activeId = this.formService.activeTemplateId();
            if (activeId) {
              void this.router.navigate(['/builder', activeId], { replaceUrl: true });
            } else {
              void this.router.navigate(['/templates']);
            }
            return;
          }

          if (this.formService.getTemplate(templateId)) {
            if (this.formService.activeTemplateId() !== templateId) {
              this.formService.switchTemplate(templateId);
            }
          } else {
            void this.router.navigate(['/templates']);
          }
        },
        error: (err) => console.error('[DragDropEditor] Route subscription error:', err),
      });

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
