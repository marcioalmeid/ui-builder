import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormPreview } from '../main-canvas/form-preview/form-preview';
import { FormService } from '../../services/form.services';
import { JobService } from '../../services/job.service';
import { RetroactivityService } from '../../services/retroactivity.service';
import { JobSubmission } from '../../models/job-submission';
import { lastPublishedVersion } from '../../utils/retroactivity';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [FormPreview, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './job-detail.html',
})
export class JobDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);
  private formService = inject(FormService);
  private retroactivity = inject(RetroactivityService);

  private taskId = toSignal(
    this.route.paramMap.pipe(
      map(
        (params) => params.get('taskId') ?? params.get('jobId') ?? ''
      )
    ),
    { initialValue: '' }
  );

  job = signal<JobSubmission | undefined>(undefined);
  saved = signal(false);
  showAdvanced = signal(false);

  constructor() {
    effect(() => {
      const id = this.taskId();
      this.job.set(id ? this.jobService.getById(id) : undefined);
      this.saved.set(false);
      this.showAdvanced.set(false);
    });
  }

  template = computed(() => {
    const job = this.job();
    return job ? this.formService.getTemplate(job.templateId) : undefined;
  });

  effectiveLayout = computed(() => {
    const job = this.job();
    const template = this.template();
    if (!job || !template) return undefined;
    return this.retroactivity.resolveJob(job, template);
  });

  publishedVersion = computed(() => {
    const template = this.template();
    if (!template) return null;
    return lastPublishedVersion(template);
  });

  canMigrate = computed(() => {
    const job = this.job();
    const template = this.template();
    if (!job || !template) return false;
    return this.retroactivity.canMigrate(job, template);
  });

  pin = computed(() => this.job()?.templateVersion ?? 0);

  templateLabel = computed(() => {
    const job = this.job();
    return job ? this.jobService.displayTemplateName(job) : 'Task';
  });

  updateField(fieldId: string, value: unknown) {
    this.job.update((job) => {
      if (!job) return job;
      return { ...job, data: { ...job.data, [fieldId]: value } };
    });
    this.saved.set(false);
  }

  saveJob() {
    const job = this.job();
    if (!job) return;
    this.jobService.save(job);
    this.saved.set(true);
  }

  cloneTask() {
    const job = this.job();
    if (!job) return;
    const clone = this.jobService.clone(job.id);
    if (clone) {
      void this.router.navigate(['/tasks', clone.id]);
    }
  }

  migrate() {
    const id = this.taskId();
    if (!id) return;
    const updated = this.jobService.migrate(id);
    if (updated) {
      this.job.set(updated);
      this.saved.set(false);
    }
  }
}
