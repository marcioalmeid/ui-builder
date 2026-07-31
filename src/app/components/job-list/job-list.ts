import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../../services/job.service';
import { FormService } from '../../services/form.services';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.css',
})
export class JobList {
  private jobService = inject(JobService);
  formService = inject(FormService);

  jobs = computed(() => this.jobService.list());

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  fieldSummary(data: Record<string, unknown>): string {
    const entries = Object.entries(data).slice(0, 3);
    if (!entries.length) return 'No field values';
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
  }
}
