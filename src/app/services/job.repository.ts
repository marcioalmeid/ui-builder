import { Injectable, signal } from '@angular/core';
import { JobSubmission } from '../models/job-submission';

const JOB_KEY_PREFIX = 'job-data-';

@Injectable({
  providedIn: 'root',
})
export class JobRepository {
  readonly revision = signal(0);

  save(submission: JobSubmission): void {
    localStorage.setItem(`${JOB_KEY_PREFIX}${submission.id}`, JSON.stringify(submission));
    this.revision.update((n) => n + 1);
  }

  getById(jobId: string): JobSubmission | undefined {
    return this.list().find((job) => job.id === jobId);
  }

  list(): JobSubmission[] {
    this.revision();
    const submissions: JobSubmission[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(JOB_KEY_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<JobSubmission>;
        submissions.push({
          id: parsed.id ?? key.replace(JOB_KEY_PREFIX, ''),
          templateId: parsed.templateId ?? '',
          templateVersion: parsed.templateVersion,
          templateName: parsed.templateName,
          data: parsed.data ?? {},
          events: parsed.events ?? [],
          submittedAt: parsed.submittedAt ?? 0,
          appliedFieldEventIds: parsed.appliedFieldEventIds ?? [],
          appliedRuleEventIds: parsed.appliedRuleEventIds ?? [],
        });
      } catch {
        // skip corrupt entries
      }
    }

    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  }

  listByTemplate(templateId: string): JobSubmission[] {
    return this.list().filter((job) => job.templateId === templateId);
  }

  replaceAll(jobs: JobSubmission[]): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(JOB_KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    for (const job of jobs) {
      localStorage.setItem(`${JOB_KEY_PREFIX}${job.id}`, JSON.stringify(job));
    }
    this.revision.update((n) => n + 1);
  }
}
