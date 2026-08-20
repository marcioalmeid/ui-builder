import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { TASK_TEMPLATE_CONTEXTS } from '../../models/task-template';

@Component({
  selector: 'app-task-new',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './task-new.html',
  styleUrl: './task-new.css',
})
export class TaskNew {
  private readonly formService = inject(FormService);
  private readonly router = inject(Router);

  publishedTemplates = computed(() =>
    this.formService.templates().filter((t) => t.status === 'published')
  );

  contextLabel(contextId: string): string {
    return (
      TASK_TEMPLATE_CONTEXTS.find((c) => c.id === contextId)?.label ?? contextId
    );
  }

  startTask(templateId: string) {
    void this.router.navigate(['/run', templateId]);
  }
}
