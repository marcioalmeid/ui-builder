import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { FormService } from '../../services/form.services';
import { JobService } from '../../services/job.service';
import { NewTemplateDialog } from '../new-template-dialog/new-template-dialog';
import { TaskTemplate } from '../../models/task-template';
import { confirmDialog, alertDialog } from '../../utils/confirmation';

type StatusFilter = 'all' | 'draft' | 'published';

@Component({
  selector: 'app-template-library',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './template-library.html',
  styleUrl: './template-library.css',
})
export class TemplateLibrary {
  private readonly formService = inject(FormService);
  private readonly jobService = inject(JobService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  search = signal('');
  statusFilter = signal<StatusFilter>('all');

  filteredTemplates = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.formService.templates().filter((template) => {
      if (status !== 'all' && template.status !== status) return false;
      if (!q) return true;
      return template.name.toLowerCase().includes(q);
    });
  });

  linkedTaskCount(templateId: string): number {
    this.jobService.revision();
    return this.jobService.listByTemplate(templateId).length;
  }

  canDelete(template: TaskTemplate): boolean {
    return (
      this.linkedTaskCount(template.id) === 0 &&
      this.formService.templates().length > 1
    );
  }

  deleteHint(template: TaskTemplate): string {
    const jobs = this.linkedTaskCount(template.id);
    if (jobs > 0) {
      return `Cannot delete: ${jobs} task(s) are linked to this template.`;
    }
    if (this.formService.templates().length <= 1) {
      return 'Cannot delete the only template. Create another first.';
    }
    return 'Delete this template';
  }

  openNewTemplateDialog() {
    const ref = this.dialog.open(NewTemplateDialog, { width: '420px' });
    ref.afterClosed().subscribe((createdId: string | false | undefined) => {
      if (typeof createdId === 'string' && createdId) {
        void this.router.navigate(['/builder', createdId]);
      }
    });
  }

  openStudio(template: TaskTemplate) {
    this.formService.switchTemplate(template.id);
    void this.router.navigate(['/builder', template.id]);
  }

  cloneTemplate(template: TaskTemplate, event: Event) {
    event.stopPropagation();
    const jobCount = this.jobService.listByTemplate(template.id).length;
    const confirmed = confirmDialog(
      [
        `Clone creates a NEW template in a free department (one template per department)`,
        jobCount > 0
          ? `The ${jobCount} existing task(s) stay on "${template.name}".`
          : '',
        '',
        'Clone anyway?',
      ]
        .filter(Boolean)
        .join('\n')
    );
    if (!confirmed) return;

    const result = this.formService.cloneTemplate(template.id);
    if (!result.success) {
      alertDialog(result.error ?? 'Could not clone template.');
      return;
    }
    const id = this.formService.activeTemplateId();
    if (id) void this.router.navigate(['/builder', id]);
  }

  deleteTemplate(template: TaskTemplate, event: Event) {
    event.stopPropagation();
    if (!this.canDelete(template)) {
      alertDialog(this.deleteHint(template));
      return;
    }
    const confirmed = confirmDialog(
      `Delete "${template.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = this.formService.deleteTemplate(template.id);
    if (!result.success) {
      alertDialog(result.error ?? 'Could not delete template.');
    }
  }
}
