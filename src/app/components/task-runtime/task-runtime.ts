import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { JobService } from '../../services/job.service';
import { FormPreview } from '../main-canvas/form-preview/form-preview';
import {
  buildInitialJobData,
  validateJobData,
} from '../../utils/job-validation';
import { FormField } from '../../models/field';
import { isFieldVisible } from '../../utils/field-visibility';
import { lastPublishedLayout, lastPublishedVersion } from '../../utils/retroactivity';

@Component({
  selector: 'app-task-runtime',
  standalone: true,
  imports: [FormPreview, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './task-runtime.html',
  styleUrl: './task-runtime.css',
})
export class TaskRuntime {
  private route = inject(ActivatedRoute);
  formService = inject(FormService);
  private jobService = inject(JobService);

  templateId = this.route.snapshot.paramMap.get('templateId') ?? '';
  template = this.formService.getTemplate(this.templateId);
  runtimeLayout = this.template ? lastPublishedLayout(this.template) : undefined;
  publishedVersion = this.template ? lastPublishedVersion(this.template) : 0;

  jobData = signal<Record<string, unknown>>({});
  validationErrors = signal<string[]>([]);
  submitted = signal(false);
  linkCopied = signal(false);

  private templateFields: FormField[] =
    this.runtimeLayout?.rows.flatMap((row) => row.fields) ?? [];

  requiredFields = computed(() =>
    this.templateFields.filter(
      (f) =>
        f.required &&
        f.type !== 'section-header' &&
        f.type !== 'button' &&
        isFieldVisible(f, this.jobData(), this.runtimeLayout?.workflowRules ?? [])
    )
  );

  filledRequiredCount = computed(() => {
    const data = this.jobData();
    return this.requiredFields().filter((field) => {
      const value = data[field.id];
      if (field.type === 'checkbox') return value === true;
      if (field.type === 'cost-breakdown') {
        const v = value as { grossBudget?: unknown } | undefined;
        return v?.grossBudget !== '' && v?.grossBudget != null;
      }
      return value !== '' && value != null;
    }).length;
  });

  constructor() {
    if (this.template) {
      this.jobData.set(buildInitialJobData(this.templateFields));
    }
  }

  updateField(fieldId: string, value: unknown) {
    this.jobData.update((data) => ({ ...data, [fieldId]: value }));
    this.validationErrors.set([]);
  }

  submitTask() {
    if (!this.template) return;

    const errors = validateJobData(
      this.templateFields,
      this.jobData(),
      this.runtimeLayout?.workflowRules ?? []
    );
    this.validationErrors.set(errors);

    if (errors.length) return;

    this.jobService.submit(this.templateId, this.jobData());
    this.submitted.set(true);
  }

  submitAnother() {
    this.jobData.set(buildInitialJobData(this.templateFields));
    this.validationErrors.set([]);
    this.submitted.set(false);
  }

  async copyRunLink() {
    const url = `${window.location.origin}/run/${this.templateId}`;
    await navigator.clipboard.writeText(url);
    this.linkCopied.set(true);
    setTimeout(() => this.linkCopied.set(false), 2000);
  }
}
