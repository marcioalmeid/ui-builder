import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { TaskTemplate } from '../../models/task-template';

@Component({
  selector: 'app-task-new',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './task-new.html',
  styleUrl: './task-new.css',
})
export class TaskNew {
  private readonly formService = inject(FormService);
  private readonly router = inject(Router);

  filteredTemplates = computed(() => {
    return this.formService.templates().filter(
      (template) => template.status === 'published'
    );
  });

  startTask(templateId: string) {
    void this.router.navigate(['/run', templateId]);
  }
}