import { Component, computed, effect, ElementRef, inject, signal, OnInit, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormService } from '../../services/form.services';
import { TASK_TEMPLATE_CONTEXTS } from '../../models/task-template';
import { NewTemplateDialog } from '../new-template-dialog/new-template-dialog';
import { PublishConfirmDialog } from '../publish-confirm-dialog/publish-confirm-dialog';
import { buildPublishSummary } from '../../utils/publish-summary';
import { validateTemplateForPublish } from '../../utils/template-readiness';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-template-selector',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    RouterLink,
  ],
  templateUrl: './template-selector.html',
  styleUrl: './template-selector.css',
})
export class TemplateSelector implements OnInit {
  formService = inject(FormService);
  private dialog = inject(MatDialog);
  private publishBtn = viewChild<ElementRef<HTMLButtonElement>>('publishBtn');
  contexts = TASK_TEMPLATE_CONTEXTS;

  editName = '';
  editContext = 'general';
  publishErrors = signal<string[]>([]);
  showPublishSuccess = signal(false);
  publishHighlight = signal(false);

  canPublish = computed(() => {
    if (this.formService.activeTemplate()?.status !== 'draft') return false;
    return validateTemplateForPublish(
      this.formService.rows(),
      this.formService.dataBindings(),
      this.formService.workflowRules()
    ).valid;
  });

  constructor() {
    effect(() => {
      const requestCount = this.formService.publishFocusRequest();
      if (requestCount === 0) return;

      queueMicrotask(() => {
        const button = this.publishBtn()?.nativeElement;
        if (!button) return;

        button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        button.focus({ preventScroll: true });
        this.publishHighlight.set(true);
        window.setTimeout(() => this.publishHighlight.set(false), 2000);
      });
    });
  }

  ngOnInit() {
    this.syncEditFields();
  }

  private syncEditFields() {
    const active = this.formService.activeTemplate();
    if (active) {
      this.editName = active.name;
      this.editContext = active.context;
    }
  }

  onTemplateChange(templateId: string) {
    this.publishErrors.set([]);
    this.showPublishSuccess.set(false);
    this.formService.switchTemplate(templateId);
    this.syncEditFields();
  }

  openNewTemplateDialog() {
    this.dialog.open(NewTemplateDialog, { width: '420px' });
  }

  saveTemplateSettings() {
    this.formService.updateTemplateMeta(this.editName, this.editContext);
  }

  cloneTemplate() {
    this.formService.cloneTemplate();
    this.publishErrors.set([]);
    this.showPublishSuccess.set(false);
    this.syncEditFields();
  }

  publishTemplate() {
    this.showPublishSuccess.set(false);
    const active = this.formService.activeTemplate();
    if (!active) return;

    const validation = validateTemplateForPublish(
      this.formService.rows(),
      this.formService.dataBindings(),
      this.formService.workflowRules()
    );

    const summary = buildPublishSummary(
      this.formService.rows(),
      this.formService.dataBindings(),
      this.formService.previewVisited(),
      this.formService.workflowRules()
    );

    const dialogRef = this.dialog.open(PublishConfirmDialog, {
      width: '440px',
      data: {
        templateName: active.name,
        summary,
        errors: validation.errors,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const result = this.formService.publishTemplate();
      if (!result.success) {
        this.publishErrors.set(result.errors);
        return;
      }
      this.publishErrors.set([]);
      this.showPublishSuccess.set(true);
    });
  }

  unpublishTemplate() {
    this.formService.unpublishTemplate();
    this.showPublishSuccess.set(false);
    this.publishErrors.set([]);
  }

  exportForm() {
    this.formService.exportForm();
  }

  dismissPublishSuccess() {
    this.showPublishSuccess.set(false);
  }
}
