import { Injectable, inject } from '@angular/core';
import { FormField } from '../models/field';
import { JobSubmission } from '../models/job-submission';
import { JobRepository } from './job.repository';
import { FormService } from './form.services';
import { RetroactivityService } from './retroactivity.service';
import { getWorkflowEmittedEvents } from '../utils/workflow-evaluation';
import {
  getAllLayoutFields,
  lastPublishedLayout,
  lastPublishedVersion,
} from '../utils/retroactivity';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private repository = inject(JobRepository);
  private formService = inject(FormService);
  private retroactivity = inject(RetroactivityService);

  submit(templateId: string, data: Record<string, unknown>): JobSubmission {
    const template = this.formService.getTemplate(templateId);
    const layout = template ? lastPublishedLayout(template) : undefined;
    const fields = layout?.rows.flatMap((row) => row.fields) ?? [];
    const pin = template ? lastPublishedVersion(template) : undefined;
    const events = getWorkflowEmittedEvents(
      layout?.workflowRules ?? [],
      data,
      {
        fields,
        templateId,
        templateVersion: pin,
        emittedAt: Date.now(),
      }
    );

    const submission: JobSubmission = {
      id: `${templateId}-${Date.now()}`,
      templateId,
      templateVersion: pin,
      templateName: template?.name,
      data,
      events,
      submittedAt: Date.now(),
      appliedFieldEventIds: [],
      appliedRuleEventIds: [],
    };

    this.repository.save(submission);
    return submission;
  }

  /** Duplicate a submission as a new task (same template pin + field values). */
  clone(jobId: string): JobSubmission | undefined {
    const source = this.repository.getById(jobId);
    if (!source) return undefined;

    const data = structuredClone(source.data);
    this.markCloneTitle(source.templateId, data);

    const clone: JobSubmission = {
      id: `${source.templateId}-${Date.now()}`,
      templateId: source.templateId,
      templateVersion: source.templateVersion,
      templateName:
        this.formService.getTemplate(source.templateId)?.name ?? source.templateName,
      data,
      events: structuredClone(source.events),
      submittedAt: Date.now(),
      appliedFieldEventIds: [...(source.appliedFieldEventIds ?? [])],
      appliedRuleEventIds: [...(source.appliedRuleEventIds ?? [])],
    };

    this.repository.save(clone);
    return clone;
  }

  /** Append " (Copy)" to the task title field so clones are recognizable in the list. */
  private markCloneTitle(templateId: string, data: Record<string, unknown>): void {
    const template = this.formService.getTemplate(templateId);
    if (!template) return;

    const fields = getAllLayoutFields(template.layout);
    const titleField = this.titleField(fields);
    if (!titleField) return;

    const current = data[titleField.id];
    const base =
      typeof current === 'string' && current.trim() ? current.trim() : 'Untitled';
    data[titleField.id] = `${base} (Copy)`;
  }

  private titleField(fields: FormField[]): FormField | undefined {
    return (
      fields.find((field) => field.required && field.type === 'text') ??
      fields.find((field) => field.type === 'text')
    );
  }

  getById(jobId: string): JobSubmission | undefined {
    return this.repository.getById(jobId);
  }

  save(submission: JobSubmission): void {
    this.repository.save(submission);
  }

  migrate(jobId: string): JobSubmission | undefined {
    const job = this.repository.getById(jobId);
    if (!job) return undefined;
    const template = this.formService.getTemplate(job.templateId);
    if (!template) return job;
    return this.retroactivity.migrate(job, template);
  }

  migrateFully(jobId: string): JobSubmission | undefined {
    const job = this.repository.getById(jobId);
    if (!job) return undefined;
    const template = this.formService.getTemplate(job.templateId);
    if (!template) return job;
    return this.retroactivity.migrateFully(job, template);
  }

  list(): JobSubmission[] {
    return this.repository.list();
  }

  listByTemplate(templateId: string): JobSubmission[] {
    return this.repository.listByTemplate(templateId);
  }

  /** Keep linked tasks' denormalized templateName in sync after a rename. */
  syncTemplateName(templateId: string, name: string): void {
    for (const job of this.repository.listByTemplate(templateId)) {
      if (job.templateName === name) continue;
      this.repository.save({ ...job, templateName: name });
    }
  }

  /** Prefer live template name; fall back to the value stored at submit time. */
  displayTemplateName(job: JobSubmission): string {
    return (
      this.formService.getTemplate(job.templateId)?.name ??
      job.templateName ??
      job.templateId
    );
  }

  /** Drop tasks whose template was removed. */
  pruneOrphanJobs(): number {
    const jobs = this.repository.list();
    const kept = jobs.filter((job) => Boolean(this.formService.getTemplate(job.templateId)));
    const removed = jobs.length - kept.length;
    if (removed > 0) {
      this.repository.replaceAll(kept);
    }
    return removed;
  }
}
