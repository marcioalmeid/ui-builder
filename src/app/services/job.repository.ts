import { Injectable } from '@angular/core';
import { JobSubmission } from '../models/job-submission';

const JOB_KEY_PREFIX = 'job-data-';

@Injectable({
  providedIn: 'root',
})
export class JobRepository {
  save(submission: JobSubmission): void {
    localStorage.setItem(`${JOB_KEY_PREFIX}${submission.id}`, JSON.stringify(submission));
  }

  list(): JobSubmission[] {
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
          submittedAt: parsed.submittedAt ?? 0,
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
}
