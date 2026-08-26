import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import {
  JobSubmission,
  TASK_STATUSES,
  TaskStatus,
  normalizeTaskStatus,
} from '../../models/job-submission';
import { JobService } from '../../services/job.service';
import { FormService } from '../../services/form.services';
import { RetroactivityService } from '../../services/retroactivity.service';
import {
  ResolvedListColumn,
  TaskListContext,
  buildTaskListContext,
  matchesColumnFilters,
  matchesFullTextSearch,
  normalizeListView,
  resolveListColumns,
  taskFieldValue,
  taskTitleValue,
} from '../../utils/layout-contract';

const VIEW_MODE_KEY = 'tasks-view-mode';

type TasksViewMode = 'list' | 'table' | 'kanban';
type StatusFilter = 'all' | TaskStatus;
type TemplateFilter = 'all' | string;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
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
  templateFilter = signal<TemplateFilter>('all');
  columnFilters = signal<Record<string, string>>({});

  tasks = computed(() => {
    this.jobService.revision();
    return this.jobService.list();
  });

  taskContexts = computed(() => {
    const contexts = new Map<string, TaskListContext>();
    for (const task of this.tasks()) {
      contexts.set(task.id, this.contextFor(task));
    }
    return contexts;
  });

  publishedTemplates = computed(() =>
    this.formService.templates().filter((template) => template.status === 'published')
  );

  activeTemplateColumns = computed((): ResolvedListColumn[] => {
    const templateId = this.columnTemplateId();
    if (templateId === 'all') return [];

    const template = this.formService.getTemplate(templateId);
    if (!template) return [];

    // Hub columns follow the current template listView (including draft edits).
    const context = buildTaskListContext(template.layout);
    return resolveListColumns(context.listView, context.fields);
  });

  /** Template whose list columns are shown — explicit filter or auto-detected. */
  columnTemplateId = computed((): TemplateFilter => {
    const explicit = this.templateFilter();
    if (explicit !== 'all') return explicit;

    const published = this.publishedTemplates();
    if (published.length === 1) return published[0].id;

    const taskTemplateIds = new Set(this.tasks().map((task) => task.templateId));
    if (taskTemplateIds.size === 1) {
      return [...taskTemplateIds][0];
    }

    return 'all';
  });

  filteredTasks = computed(() => {
    const q = this.search().trim();
    const sf = this.statusFilter();
    const tf = this.templateFilter();
    const filters = this.columnFilters();
    const contexts = this.taskContexts();

    return this.tasks().filter((task) => {
      if (sf !== 'all' && normalizeTaskStatus(task.status) !== sf) return false;
      if (tf !== 'all' && task.templateId !== tf) return false;

      const context = contexts.get(task.id);
      if (!context) return false;

      if (!matchesFullTextSearch(task, q, context)) return false;
      if (!matchesColumnFilters(task, filters, context)) return false;

      return true;
    });
  });

  filteredTasksByStatus = computed(() => {
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
    if (mode === 'list' || mode === 'table' || mode === 'kanban') {
      this.setViewMode(mode);
    }
  }

  onTemplateFilterChange(templateId: TemplateFilter) {
    this.templateFilter.set(templateId);
    this.columnFilters.set({});
  }

  setColumnFilter(fieldId: string, value: string) {
    this.columnFilters.update((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  clearColumnFilters() {
    this.columnFilters.set({});
  }

  hasActiveColumnFilters(): boolean {
    return Object.values(this.columnFilters()).some((value) => value.trim().length > 0);
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
    const context = this.taskContexts().get(task.id);
    const title = context ? taskTitleValue(task, context) : '';
    return title || this.jobService.displayTemplateName(task) || 'Untitled task';
  }

  showTemplateSubtitle(task: JobSubmission): boolean {
    const context = this.taskContexts().get(task.id);
    const title = context ? taskTitleValue(task, context) : '';
    const templateName = this.jobService.displayTemplateName(task);
    return Boolean(title && templateName && title !== templateName);
  }

  templateLabel(task: JobSubmission): string {
    return this.jobService.displayTemplateName(task);
  }

  cellValue(task: JobSubmission, fieldId: string): string {
    const context = this.taskContexts().get(task.id);
    if (!context) return '';
    return taskFieldValue(task, fieldId, context);
  }

  columnFilterValue(fieldId: string): string {
    return this.columnFilters()[fieldId] ?? '';
  }

  fieldSummary(task: JobSubmission): string {
    const context = this.taskContexts().get(task.id);
    if (!context) return '';

    const columns = resolveListColumns(context.listView, context.fields);
    const parts: string[] = [];

    for (const column of columns) {
      const value = taskFieldValue(task, column.fieldId, context);
      if (!value) continue;
      parts.push(`${column.label}: ${value}`);
      if (parts.length >= 3) break;
    }

    return parts.join(' · ');
  }

  needsUpdate(task: JobSubmission): boolean {
    const template = this.formService.getTemplate(task.templateId);
    if (!template) return false;
    return this.retroactivity.canMigrate(task, template);
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

  columnWidthClass(width: ResolvedListColumn['width']): string {
    switch (width) {
      case 'small':
        return 'tasks-table__col--small';
      case 'large':
        return 'tasks-table__col--large';
      default:
        return 'tasks-table__col--medium';
    }
  }

  private contextFor(task: JobSubmission): TaskListContext {
    const template = this.formService.getTemplate(task.templateId);
    if (!template) {
      return buildTaskListContext({ rows: [], dataBindings: [], workflowRules: [] });
    }
    // Field schema/visibility stay version-pinned; title/columns/search follow the
    // live template listView so Template Studio toggles apply immediately in the hub.
    const layout = this.retroactivity.resolveJob(task, template);
    const context = buildTaskListContext(layout);
    return {
      ...context,
      listView: normalizeListView(template.layout.listView, context.fields),
    };
  }
}

function readViewMode(): TasksViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'list' || stored === 'table' || stored === 'kanban') return stored;
  } catch {
    // ignore
  }
  return 'list';
}
