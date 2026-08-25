import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormService } from '../../services/form.services';
import { JobService } from '../../services/job.service';
import { RetroactivityService } from '../../services/retroactivity.service';
import { PublishConfirmDialog, PublishConfirmResult } from '../publish-confirm-dialog/publish-confirm-dialog';
import { buildPublishSummary } from '../../utils/publish-summary';
import { getAllFields, validateTemplateForPublish } from '../../utils/template-readiness';
import { MigrationLedgerService } from '../../services/migration-ledger.service';
import { getAllLayoutFields, normalizeJob } from '../../utils/retroactivity';
import { confirmDialog, alertDialog } from '../../utils/confirmation';

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
export class TemplateSelector {
  formService = inject(FormService);
  private dialog = inject(MatDialog);
  private jobService = inject(JobService);
  private retroactivity = inject(RetroactivityService);
  private ledger = inject(MigrationLedgerService);
  private router = inject(Router);
  private publishBtn = viewChild<ElementRef<HTMLButtonElement>>('publishBtn');

  editName = '';
  editDepartment = '';
  publishErrors = signal<string[]>([]);
  showPublishSuccess = signal(false);
  publishMigrateCount = signal(0);
  publishHighlight = signal(false);

  linkedJobCount = computed(() => {
    const id = this.formService.activeTemplate()?.id;
    return id ? this.jobService.listByTemplate(id).length : 0;
  });

  // Filter out departments already used by other templates (keep current one always visible)
  availableDepartments = computed(() => {
    const active = this.formService.activeTemplate();
    const activeId = active?.id ?? '';
    return this.formService.availableDepartments().filter(
      (dept) => !this.formService.isDepartmentTaken(dept, activeId)
    );
  });

  cloneHint = computed(() => {
    const count = this.linkedJobCount();
    if (count === 0) {
      return 'Creates a copy in a free department (one template per department).';
    }
    return `Creates a copy in a free department. ${count} existing task(s) stay on the original.`;
  });

  constructor() {
    effect(() => {
      const active = this.formService.activeTemplate();
      if (active) {
        this.editName = active.name;
        this.editDepartment = (active.departments?.[0] ?? '');
      }
    });

    effect(() => {
      const requestCount = this.formService.publishFocusRequest();
      if (requestCount === 0) return;
      if (!this.formService.consumePublishFocusRequest()) return;

      queueMicrotask(() => {
        const button = this.publishBtn()?.nativeElement;
        if (button) {
          button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          this.publishHighlight.set(true);
          window.setTimeout(() => this.publishHighlight.set(false), 2000);
        }
        this.publishTemplate();
      });
    });
  }

  saveTemplateSettings() {
    const active = this.formService.activeTemplate();
    const result = this.formService.updateTemplateMeta(
      this.editName,
      this.editDepartment ? [this.editDepartment] : []
    );
    if (!result.success) {
      alertDialog(result.error ?? 'Could not save template settings.');
      if (active) {
        this.editName = active.name;
        this.editDepartment = (active.departments?.[0] ?? '');
      }
      return;
    }
    if (active) {
      const updated = this.formService.activeTemplate();
      if (updated) {
        this.jobService.syncTemplateName(updated.id, updated.name);
      }
    }
  }

  cloneTemplate() {
    const active = this.formService.activeTemplate();
    const jobCount = active ? this.jobService.listByTemplate(active.id).length : 0;

    const confirmed = confirmDialog(
      [
        `Clone creates a NEW template in a free department (one template per department)`,
        jobCount > 0
          ? `The ${jobCount} existing task(s) stay on "${active?.name}".`
          : '',
        '',
        'To edit this template and keep tasks linked, cancel and use “Unpublish to edit”.',
        '',
        'Clone anyway?',
      ]
        .filter(Boolean)
        .join('\n')
    );
    if (!confirmed) return;

    const result = this.formService.cloneTemplate();
    if (!result.success) {
      alertDialog(result.error ?? 'Could not clone template.');
      return;
    }
    this.publishErrors.set([]);
    this.showPublishSuccess.set(false);
    this.publishMigrateCount.set(0);
    const id = this.formService.activeTemplateId();
    if (id) void this.router.navigate(['/builder', id]);
  }

  publishTemplate() {
    if (this.dialog.openDialogs.length) return;

    this.showPublishSuccess.set(false);
    this.publishMigrateCount.set(0);
    const active = this.formService.activeTemplate();
    if (!active || active.status !== 'draft') return;

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

    const preview = this.formService.previewPublish();
    const reuseError =
      preview.error === 'FIELD_ID_REUSED'
        ? `Field id "${preview.fieldId}" was retired and cannot be reused.`
        : undefined;

    const fieldLabels: Record<string, string> = {};
    const lastSnapshot = active.versions?.at(-1);
    if (lastSnapshot) {
      for (const field of getAllLayoutFields(lastSnapshot.layout)) {
        fieldLabels[field.id] = field.label;
      }
    }
    for (const field of getAllFields(this.formService.rows())) {
      fieldLabels[field.id] = field.label;
    }

    const jobs = this.jobService.listByTemplate(active.id).map((job) => {
      const normalized = normalizeJob(job);
      const title = Object.values(job.data).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      return {
        ...normalized,
        id: job.id,
        label: title || job.templateName || job.id,
      };
    });
    const ledger = this.ledger.get(active.id);

    const dialogRef = this.dialog.open(PublishConfirmDialog, {
      width: '640px',
      maxWidth: '95vw',
      data: {
        templateName: active.name,
        summary,
        errors: validation.errors,
        nextVersion: preview.nextVersion,
        jobCount: preview.jobCount,
        jobs,
        ledger,
        diff: preview.diff,
        riskPolicy: active.riskPolicy ?? 'ADDITIVE',
        fieldLabels,
        reuseError,
      },
    });

    dialogRef.afterClosed().subscribe((result: PublishConfirmResult | undefined) => {
      if (!result?.confirmed) return;

      const published = this.formService.publishTemplate(result.riskPolicy);
      if (!published.success) {
        this.publishErrors.set(published.errors);
        return;
      }

      const template = this.formService.activeTemplate();
      if (template && result.migrateNow) {
        for (const job of this.jobService.listByTemplate(template.id)) {
          if (this.retroactivity.canMigrate(job, template)) {
            this.jobService.migrateFully(job.id);
          }
        }
      }

      const migrateCount = template
        ? this.jobService
            .listByTemplate(template.id)
            .filter((job) => this.retroactivity.canMigrate(job, template)).length
        : 0;

      this.publishErrors.set([]);
      this.publishMigrateCount.set(migrateCount);
      this.showPublishSuccess.set(true);
    });
  }

  unpublishTemplate() {
    this.formService.unpublishTemplate();
    this.showPublishSuccess.set(false);
    this.publishMigrateCount.set(0);
    this.publishErrors.set([]);
  }

  exportForm() {
    this.formService.exportForm();
  }

  dismissPublishSuccess() {
    this.showPublishSuccess.set(false);
    this.publishMigrateCount.set(0);
  }
}
