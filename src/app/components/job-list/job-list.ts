import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormField } from '../../models/field';
import { JobSubmission } from '../../models/job-submission';
import { JobService } from '../../services/job.service';
import { FormService } from '../../services/form.services';
import { RetroactivityService } from '../../services/retroactivity.service';
import { getAllLayoutFields } from '../../utils/retroactivity';
import { TASK_TEMPLATE_CONTEXTS } from '../../models/task-template';

const HIDDEN_FIELD_TYPES = new Set(['section-header', 'button']);

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.css',
})
export class JobList {
  private readonly jobService = inject(JobService);
  private readonly formService = inject(FormService);
  private readonly retroactivity = inject(RetroactivityService);
  private readonly router = inject(Router);

  tasks = computed(() => this.jobService.list());

  publishedTemplates = computed(() =>
    this.formService
      .templates()
      .filter((t) => t.status === 'published')
      .filter((t) => !t.name.startsWith('[S')) // keep spike templates in Templates studio
  );

  /** Include spike published templates so the hub is never empty after seed. */
  startableTemplates = computed(() => {
    const preferred = this.publishedTemplates();
    if (preferred.length > 0) return preferred;
    return this.formService.templates().filter((t) => t.status === 'published');
  });

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  contextLabel(contextId: string): string {
    return (
      TASK_TEMPLATE_CONTEXTS.find((c) => c.id === contextId)?.label ?? contextId
    );
  }

  startTask(templateId: string) {
    void this.router.navigate(['/run', templateId]);
  }

  taskTitle(task: JobSubmission): string {
    return this.titleValue(task) || this.jobService.displayTemplateName(task) || 'Untitled task';
  }

  showTemplateSubtitle(task: JobSubmission): boolean {
    const title = this.titleValue(task);
    const templateName = this.jobService.displayTemplateName(task);
    return Boolean(title && templateName && title !== templateName);
  }

  templateLabel(task: JobSubmission): string {
    return this.jobService.displayTemplateName(task);
  }

  needsUpdate(task: JobSubmission): boolean {
    const template = this.formService.getTemplate(task.templateId);
    if (!template) return false;
    return this.retroactivity.canMigrate(task, template);
  }

  publishedVersion(task: JobSubmission): number | null {
    const template = this.formService.getTemplate(task.templateId);
    return template ? this.retroactivity.publishedVersion(template) : null;
  }

  fieldSummary(task: JobSubmission): string {
    const fields = this.fieldsFor(task);
    const titleField = this.titleField(fields);
    const parts: string[] = [];

    for (const [id, raw] of Object.entries(task.data)) {
      if (id === titleField?.id) continue;
      const field = fields.find((item) => item.id === id);
      if (field && HIDDEN_FIELD_TYPES.has(field.type)) continue;
      const value = formatStoredValue(field, raw);
      if (!value) continue;
      parts.push(field?.label ? `${field.label}: ${value}` : value);
      if (parts.length >= 3) break;
    }

    return parts.join(' · ');
  }

  cloneTask(task: JobSubmission, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const clone = this.jobService.clone(task.id);
    if (clone) {
      void this.router.navigate(['/tasks', clone.id]);
    }
  }

  private titleValue(task: JobSubmission): string {
    const field = this.titleField(this.fieldsFor(task));
    if (!field) return '';
    return formatStoredValue(field, task.data[field.id]);
  }

  private titleField(fields: FormField[]): FormField | undefined {
    return (
      fields.find((field) => field.required && field.type === 'text') ??
      fields.find((field) => field.type === 'text')
    );
  }

  private fieldsFor(task: JobSubmission): FormField[] {
    const template = this.formService.getTemplate(task.templateId);
    return template ? getAllLayoutFields(template.layout) : [];
  }
}

function formatStoredValue(field: FormField | undefined, value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }
  const text = String(value);
  const option = field?.options?.find((item) => item.value === text);
  return option?.label ?? humanizeToken(text);
}

function humanizeToken(value: string): string {
  if (looksLikeUuid(value)) return '';
  if (!value.includes('-') && !value.includes('_')) return value;
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
