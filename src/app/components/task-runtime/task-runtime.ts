import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
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
import { TaskTemplate, TaskTemplateLayout } from '../../models/task-template';
import { FormRow } from '../../models/form';

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

  templateId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('templateId') ?? '')),
    { initialValue: '' }
  );
  template = computed<TaskTemplate | undefined>(() =>
    this.formService.getTemplate(this.templateId())
  );
  runtimeLayout = computed<TaskTemplateLayout | undefined>(() => {
    const tmpl = this.template();
    return tmpl ? lastPublishedLayout(tmpl) : undefined;
  });

  publishedVersion = computed(() => {
    const tmpl = this.template();
    return tmpl ? lastPublishedVersion(tmpl) : 0;
  });

  jobData = signal<Record<string, unknown>>({});
  validationErrors = signal<string[]>([]);
  submitted = signal(false);

  private templateFields = computed(() =>
    this.runtimeLayout()?.rows.flatMap((row) => row.fields) ?? []
  );

  requiredFields = computed(() =>
    this.templateFields().filter(
      (f) =>
        f.required &&
        f.type !== 'section-header' &&
        f.type !== 'button' &&
        isFieldVisible(f, this.jobData(), this.runtimeLayout()?.workflowRules ?? [])
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
    effect(() => {
      const tmpl = this.template();
      if (!tmpl) return;
      this.jobData.set(buildInitialJobData(this.templateFields()));
      this.validationErrors.set([]);
      this.submitted.set(false);
    });
  }

  updateField(fieldId: string, value: unknown) {
    this.jobData.update((data) => ({ ...data, [fieldId]: value }));
    this.validationErrors.set([]);
  }

  submitTask() {
    const tpl = this.template();
    if (!tpl) {
      this.validationErrors.set(['Template not found.']);
      return;
    }

    queueMicrotask(() => {
      try {
        const errors = validateJobData(
          this.templateFields(),
          this.jobData(),
          this.runtimeLayout()?.workflowRules ?? []
        );
        this.validationErrors.set(errors);

        if (errors.length) return;

        this.jobService.submit(this.templateId()!, this.jobData());
        this.submitted.set(true);
      } catch (error) {
        console.error('[TaskRuntime] submitTask failed:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.validationErrors.set([`Submission failed: ${msg}`]);
        this.submitted.set(false);
      }
    });
  }

  submitAnother() {
    this.jobData.set(buildInitialJobData(this.templateFields()));
    this.validationErrors.set([]);
    this.submitted.set(false);
  }
}
