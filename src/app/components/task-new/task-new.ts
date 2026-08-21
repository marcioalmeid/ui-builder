import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { TASK_TEMPLATE_CONTEXTS, TaskTemplate } from '../../models/task-template';

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

  templateMeta(template: TaskTemplate): string {
    const context = this.contextLabel(template.context);
    const name = template.name.toLowerCase();
    const contextDistinct = !name.includes(context.toLowerCase());
    const parts: string[] = [];
    if (contextDistinct) parts.push(context);
    if (template.version) parts.push(`v${template.version}`);
    return parts.join(' · ');
  }

  startTask(templateId: string) {
    void this.router.navigate(['/run', templateId]);
  }

  private contextLabel(contextId: string): string {
    return (
      TASK_TEMPLATE_CONTEXTS.find((c) => c.id === contextId)?.label ?? contextId
    );
  }
}
