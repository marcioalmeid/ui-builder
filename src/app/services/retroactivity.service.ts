import { Injectable, inject } from '@angular/core';
import { JobSubmission } from '../models/job-submission';
import { RiskPolicy, TaskTemplate, TaskTemplateLayout } from '../models/task-template';
import { JobRepository } from './job.repository';
import { MigrationLedgerService } from './migration-ledger.service';
import {
  autoApplyOnPublish,
  canMigrateJob,
  diffPublish,
  lastPublishedLayout,
  lastPublishedVersion,
  latestSnapshotVersion,
  migrateJob,
  migrateJobFully,
  normalizeJob,
  PublishDiff,
  resolveLayout,
} from '../utils/retroactivity';

export interface PublishPreview {
  nextVersion: number;
  jobCount: number;
  diff: PublishDiff;
  error?: 'FIELD_ID_REUSED';
  fieldId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RetroactivityService {
  private ledger = inject(MigrationLedgerService);
  private jobs = inject(JobRepository);

  preview(template: TaskTemplate): PublishPreview {
    const fromVersion = latestSnapshotVersion(template);
    const toVersion = fromVersion + 1;
    const prev = template.versions?.at(-1)?.layout ?? null;
    const result = diffPublish(prev, template.layout, {
      fromVersion,
      toVersion,
      retiredFieldIds: template.retiredFieldIds ?? [],
    });
    const jobCount = this.jobs.listByTemplate(template.id).length;

    if (!result.ok) {
      return {
        nextVersion: toVersion,
        jobCount,
        diff: { fieldEvents: [], ruleEvent: null },
        error: result.error,
        fieldId: result.fieldId,
      };
    }

    return { nextVersion: toVersion, jobCount, diff: result.diff };
  }

  commit(
    template: TaskTemplate,
    policy: RiskPolicy
  ): { template: TaskTemplate; error?: 'FIELD_ID_REUSED'; fieldId?: string } {
    const preview = this.preview(template);
    if (preview.error) {
      return { template, error: preview.error, fieldId: preview.fieldId };
    }

    const fromVersion = latestSnapshotVersion(template);
    const toVersion = preview.nextVersion;
    const prev = template.versions?.at(-1)?.layout ?? null;
    const result = diffPublish(prev, template.layout, {
      fromVersion,
      toVersion,
      retiredFieldIds: template.retiredFieldIds ?? [],
    });
    if (!result.ok) {
      return { template, error: result.error, fieldId: result.fieldId };
    }

    this.ledger.append(template.id, result.diff);

    const nextTemplate: TaskTemplate = {
      ...template,
      version: toVersion,
      status: 'published',
      riskPolicy: policy,
      retiredFieldIds: result.retiredFieldIds,
      versions: [
        ...(template.versions ?? []),
        { version: toVersion, layout: structuredClone(template.layout) },
      ],
      updatedAt: Date.now(),
    };

    for (const job of this.jobs.listByTemplate(template.id)) {
      const updated = autoApplyOnPublish(normalizeJob(job), result.diff, policy);
      this.jobs.save(updated);
    }

    return { template: nextTemplate };
  }

  resolveJob(job: JobSubmission, template: TaskTemplate): TaskTemplateLayout {
    const pin = job.templateVersion ?? 0;
    const snapshots = template.versions ?? [];
    if (!snapshots.length) return lastPublishedLayout(template);

    const ledger = this.ledger.get(template.id);
    return resolveLayout(
      snapshots,
      pin,
      ledger.fieldEvents,
      job.appliedFieldEventIds ?? []
    );
  }

  migrate(job: JobSubmission, template: TaskTemplate): JobSubmission {
    const ledger = this.ledger.get(template.id);
    const updated = migrateJob(normalizeJob(job), ledger.fieldEvents, ledger.ruleEvents);
    this.jobs.save(updated);
    return updated;
  }

  /** Catch up a job through every pending migrate step (still never skips Breaking). */
  migrateFully(job: JobSubmission, template: TaskTemplate): JobSubmission {
    const ledger = this.ledger.get(template.id);
    const updated = migrateJobFully(
      normalizeJob(job),
      ledger.fieldEvents,
      ledger.ruleEvents
    );
    this.jobs.save(updated);
    return updated;
  }

  canMigrate(job: JobSubmission, template: TaskTemplate): boolean {
    const ledger = this.ledger.get(template.id);
    return canMigrateJob(normalizeJob(job), ledger.fieldEvents, ledger.ruleEvents);
  }

  publishedVersion(template: TaskTemplate): number {
    return lastPublishedVersion(template);
  }
}
