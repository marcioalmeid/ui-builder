import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { FormService } from '../../services/form.services';
import { TASK_TEMPLATE_CONTEXTS, TaskTemplate } from '../../models/task-template';

type StatusFilter = 'all' | 'draft' | 'published';

@Component({
  selector: 'app-task-new',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './task-new.html',
  styleUrl: './task-new.css',
})
export class TaskNew {
  private readonly formService = inject(FormService);
  private readonly router = inject(Router);

  search = signal('');
  statusFilter = signal<StatusFilter>('published');

  filteredTemplates = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.formService.templates().filter((template) => {
      if (status !== 'all' && template.status !== status) return false;
      if (!q) return true;
      return (
        template.name.toLowerCase().includes(q) ||
        template.context.toLowerCase().includes(q)
      );
    });
  });

  contextLabel(contextId: string): string {
    return (
      TASK_TEMPLATE_CONTEXTS.find((c) => c.id === contextId)?.label ?? contextId
    );
  }

  startTask(templateId: string) {
    void this.router.navigate(['/run', templateId]);
  }
}