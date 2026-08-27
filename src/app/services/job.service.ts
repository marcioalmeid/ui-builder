import { Injectable, inject } from '@angular/core';
import { JobSubmission, TaskStatus, normalizeTaskStatus } from '../models/job-submission';
import { JobRepository } from './job.repository';
import { FormService } from './form.services';
import { RetroactivityService } from './retroactivity.service';
import { getWorkflowEmittedEvents } from '../utils/workflow-evaluation';
import {
  buildTaskListContext,
  resolveTitleField,
} from '../utils/layout-contract';
import {
  lastPublishedLayout,
  lastPublishedVersion,
} from '../utils/retroactivity';
import {
  buildTaskBundle,
  parseTaskBundle,
  serializeTaskBundle,
} from '../utils/task-bundle';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private readonly repository = inject(JobRepository);
  private readonly formService = inject(FormService);
  private readonly retroactivity = inject(RetroactivityService);

  submit(templateId: string, data: Record<string, unknown>): JobSubmission {
    const template = this.formService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template "${templateId}" not found.`);
    }
    const hasPublishedVersion = (template.versions?.length ?? 0) > 0;
    if (template.status !== 'published' && !hasPublishedVersion) {
      throw new Error(`Template "${template.name}" is not published.`);
    }

    const layout = lastPublishedLayout(template);
    const fields = layout.rows.flatMap((row) => row.fields);
    const pin = lastPublishedVersion(template);
    const events = getWorkflowEmittedEvents(
      layout.workflowRules ?? [],
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
      templateName: template.name,
      friendlyId: this.nextUniqueFriendlyId(templateId),
      data,
      events,
      submittedAt: Date.now(),
      status: 'todo',
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
      friendlyId: this.nextUniqueFriendlyId(source.templateId),
      data,
      events: structuredClone(source.events),
      submittedAt: Date.now(),
      status: 'todo',
      appliedFieldEventIds: [...(source.appliedFieldEventIds ?? [])],
      appliedRuleEventIds: [...(source.appliedRuleEventIds ?? [])],
    };

    this.repository.save(clone);
    return clone;
  }

  /** Generate the next sequential friendly ID for a template (e.g. TASK-001). */
  private nextFriendlyId(templateId: string): string {
    const allJobs = this.repository.list();
    const templateJobs = allJobs.filter((j) => j.templateId === templateId);
    let maxSeq = 0;
    for (const job of templateJobs) {
      const seq = this.parseFriendlySeq(job.friendlyId);
      if (seq > maxSeq) maxSeq = seq;
    }
    return this.formatFriendlyId(maxSeq + 1);
  }

  /** Generate a unique friendly ID avoiding collisions with existing jobs. */
  private nextUniqueFriendlyId(templateId: string): string {
    let seq = this.parseFriendlySeq(this.nextFriendlyId(templateId));
    let friendlyId = this.formatFriendlyId(seq);
    // Bump until globally unique (IDs are shared across templates).
    while (this.repository.list().some((j) => j.friendlyId === friendlyId)) {
      seq += 1;
      friendlyId = this.formatFriendlyId(seq);
    }
    return friendlyId;
  }

  private formatFriendlyId(seq: number): string {
    return `TASK-${String(seq).padStart(3, '0')}`;
  }

  /** Extract the sequence number from a friendly ID like "TASK-001". */
  private parseFriendlySeq(friendlyId?: string): number {
    if (!friendlyId) return 0;
    const match = /TASK-(\d+)/.exec(friendlyId);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  updateStatus(taskId: string, status: TaskStatus): JobSubmission | undefined {
    const job = this.repository.getById(taskId);
    if (!job) return undefined;
    const next = normalizeTaskStatus(status);
    if (job.status === next) return job;
    const updated = { ...job, status: next };
    this.repository.save(updated);
    return updated;
  }

  /** Append " (Copy)" to the task title field so clones are recognizable in the list. */
  private markCloneTitle(templateId: string, data: Record<string, unknown>): void {
    const template = this.formService.getTemplate(templateId);
    if (!template) return;

    const layout = lastPublishedLayout(template);
    const context = buildTaskListContext(layout);
    const titleField = resolveTitleField(context.fields, context.listView);
    if (!titleField) return;

    const current = data[titleField.id];
    const base =
      typeof current === 'string' && current.trim() ? current.trim() : 'Untitled';
    data[titleField.id] = `${base} (Copy)`;
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

  /** Reactive revision counter — read inside computed() to refresh task lists. */
  revision(): number {
    return this.repository.revision();
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

  /** Download all tasks as a JSON backup. */
  exportTasks(): void {
    const bundle = buildTaskBundle(this.repository.list());
    const blob = new Blob([serializeTaskBundle(bundle)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `tasks-${stamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Replace all local tasks from an exported JSON bundle.
   * Tasks whose template no longer exists are kept (they show as orphans until pruned).
   */
  importTasks(raw: string): {
    success: boolean;
    error?: string;
    count?: number;
    missingTemplateCount?: number;
  } {
    const parsed = parseTaskBundle(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error };
    }

    const tasks = parsed.bundle.tasks;
    this.repository.replaceAll(tasks);

    const missingTemplateCount = tasks.filter(
      (task) => !this.formService.getTemplate(task.templateId)
    ).length;

    return {
      success: true,
      count: tasks.length,
      missingTemplateCount,
    };
  }
}
