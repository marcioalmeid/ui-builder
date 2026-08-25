import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { FormField } from '../../models/field';
import {
  JobSubmission,
  TASK_STATUSES,
  TaskStatus,
  normalizeTaskStatus,
} from '../../models/job-submission';
import { JobService } from '../../services/job.service';
import { FormService } from '../../services/form.services';
import { RetroactivityService } from '../../services/retroactivity.service';
import { getAllLayoutFields } from '../../utils/retroactivity';

const HIDDEN_FIELD_TYPES = new Set(['section-header', 'button']);
const VIEW_MODE_KEY = 'tasks-view-mode';

type TasksViewMode = 'list' | 'kanban';
type StatusFilter = 'all' | TaskStatus;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    DragDropModule,
  ],
  templateUrl: './job-list.html',
  styleUrl: './job-list.css',
})
export class JobList {
  private readonly jobService = inject(JobService);
  private readonly formService = inject(FormService);
  private readonly retroactivity = inject(RetroactivityService);
  private readonly router = inject(Router);

  readonly statuses = TASK_STATUSES;
  readonly statusLabels = STATUS_LABELS;
  readonly connectedLists = TASK_STATUSES.map((status) => `kanban-${status}`);

  viewMode = signal<TasksViewMode>(readViewMode());
  search = signal('');
  statusFilter = signal<StatusFilter>('all');

  filteredTasks = computed(() => {
    const q = this.search().trim().toLowerCase();
    const sf = this.statusFilter();
    const all = this.tasks();
    if (sf !== 'all') {
      const filtered = all.filter((t) => normalizeTaskStatus(t.status) === sf);
      if (!q) return filtered;
      return filtered.filter((t) => {
        const title = this.taskTitle(t).toLowerCase();
        const template = this.jobService.displayTemplateName(t).toLowerCase();
        return title.includes(q) || template.includes(q);
      });
    }
    if (!q) return all;
    return all.filter((t) => {
      const title = this.taskTitle(t).toLowerCase();
      const template = this.jobService.displayTemplateName(t).toLowerCase();
      return title.includes(q) || template.includes(q);
    });
  });

  tasks = computed(() => this.jobService.list());

  tasksByStatus = computed(() => {
    const groups: Record<TaskStatus, JobSubmission[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of this.tasks()) {
      groups[normalizeTaskStatus(task.status)].push(task);
    }
    return groups;
  });

  filteredTasksByStatus = computed(() => {
    const sf = this.statusFilter();
    const q = this.search().trim().toLowerCase();
    const groups: Record<TaskStatus, JobSubmission[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of this.filteredTasks()) {
      groups[normalizeTaskStatus(task.status)].push(task);
    }
    return groups;
  });

  private readonly startableTemplates = computed(() =>
    this.formService.templates().filter((t) => t.status === 'published')
  );

  setViewMode(mode: TasksViewMode) {
    this.viewMode.set(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore quota / private mode failures
    }
  }

  onViewModeChange(mode: TasksViewMode | null) {
    if (mode === 'list' || mode === 'kanban') {
      this.setViewMode(mode);
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  statusLabel(status: TaskStatus | undefined): string {
    return STATUS_LABELS[normalizeTaskStatus(status)];
  }

  taskStatus(task: JobSubmission): TaskStatus {
    return normalizeTaskStatus(task.status);
  }

  setTaskStatus(task: JobSubmission, status: TaskStatus, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.jobService.updateStatus(task.id, status);
  }

  createTask() {
    const templates = this.startableTemplates();
    if (templates.length === 1) {
      void this.router.navigate(['/run', templates[0].id]);
      return;
    }
    void this.router.navigate(['/tasks/new']);
  }

  taskTitle(task: JobSubmission): string {
    return this.titleValue(task) || this.jobService.displayTemplateName(task) || 'Untitled task';
  }

  showTemplateSubtitle(task: JobSubmission): boolean {
    const title = this.titleValue(task);
    const templateName = this.jobService.displayTemplateName(task);
    return Boolean(title && templateName && title !== templateName);
  }

  templateLabel(task: JobSubmission): string {
    return this.jobService.displayTemplateName(task);
  }

  needsUpdate(task: JobSubmission): boolean {
    const template = this.formService.getTemplate(task.templateId);
    if (!template) return false;
    return this.retroactivity.canMigrate(task, template);
  }

  publishedVersion(task: JobSubmission): number | null {
    const template = this.formService.getTemplate(task.templateId);
    return template ? this.retroactivity.publishedVersion(template) : null;
  }

  fieldSummary(task: JobSubmission): string {
    const fields = this.fieldsFor(task);
    const titleField = this.titleField(fields);
    const parts: string[] = [];

    for (const [id, raw] of Object.entries(task.data)) {
      if (id === titleField?.id) continue;
      const field = fields.find((item) => item.id === id);
      if (field && HIDDEN_FIELD_TYPES.has(field.type)) continue;
      const value = formatStoredValue(field, raw);
      if (!value) continue;
      parts.push(field?.label ? `${field.label}: ${value}` : value);
      if (parts.length >= 3) break;
    }

    return parts.join(' · ');
  }

  cloneTask(task: JobSubmission, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const clone = this.jobService.clone(task.id);
    if (clone) {
      void this.router.navigate(['/tasks', clone.id]);
    }
  }

  onKanbanDrop(event: CdkDragDrop<JobSubmission[]>, targetStatus: TaskStatus) {
    if (event.previousContainer === event.container) {
      return;
    }

    const task = (event.item.data as JobSubmission | undefined)
    ?? event.previousContainer.data[event.previousIndex];
    if (!task) return;

    this.jobService.updateStatus(task.id, targetStatus);
  }

  private titleValue(task: JobSubmission): string {
    const field = this.titleField(this.fieldsFor(task));
    if (!field) return '';
    return formatStoredValue(field, task.data[field.id]);
  }

  private titleField(fields: FormField[]): FormField | undefined {
    return (
      fields.find((field) => field.required && field.type === 'text') ??
      fields.find((field) => field.type === 'text')
    );
  }

  private fieldsFor(task: JobSubmission): FormField[] {
    const template = this.formService.getTemplate(task.templateId);
    if (!template) return [];
    const layout = this.retroactivity.resolveJob(task, template);
    return getAllLayoutFields(layout);
  }
}

function formatStoredValue(field: FormField | undefined, raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (field?.type === 'date' && typeof raw === 'string') {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }
  if (Array.isArray(raw)) {
    return raw.map(String).join(', ');
  }
  return String(raw);
}

function readViewMode(): TasksViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'list' || stored === 'kanban') return stored;
  } catch {
    // ignore
  }
  return 'list';
}
