import { Injectable, inject } from '@angular/core';
import { JobSubmission } from '../models/job-submission';
import { JobRepository } from './job.repository';
import { FormService } from './form.services';
import { getWorkflowEmittedEvents } from '../utils/workflow-evaluation';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private repository = inject(JobRepository);
  private formService = inject(FormService);

  submit(templateId: string, data: Record<string, unknown>): JobSubmission {
    const template = this.formService.getTemplate(templateId);
    const fields = template?.layout.rows.flatMap((row) => row.fields) ?? [];
    const events = getWorkflowEmittedEvents(
      template?.layout.workflowRules ?? [],
      data,
      {
        fields,
        templateId,
        templateVersion: template?.version,
        emittedAt: Date.now(),
      }
    );

    const submission: JobSubmission = {
      id: `${templateId}-${Date.now()}`,
      templateId,
      templateVersion: template?.version,
      templateName: template?.name,
      data,
      events,
      submittedAt: Date.now(),
    };

    this.repository.save(submission);
    return submission;
  }

  list(): JobSubmission[] {
    return this.repository.list();
  }

  listByTemplate(templateId: string): JobSubmission[] {
    return this.repository.listByTemplate(templateId);
  }
}
