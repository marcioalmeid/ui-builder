import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./components/job-list/job-list').then((m) => m.JobList),
  },
  {
    path: 'tasks/new',
    loadComponent: () =>
      import('./components/task-new/task-new').then((m) => m.TaskNew),
  },
  {
    path: 'tasks/:taskId',
    loadComponent: () =>
      import('./components/job-detail/job-detail').then((m) => m.JobDetail),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./components/template-library/template-library').then(
        (m) => m.TemplateLibrary
      ),
  },
  {
    path: 'builder',
    loadComponent: () =>
      import('./drag-drop-editor/drag-drop-editor').then((m) => m.DragDropEditorComponent),
  },
  {
    path: 'builder/:templateId',
    loadComponent: () =>
      import('./drag-drop-editor/drag-drop-editor').then((m) => m.DragDropEditorComponent),
  },
  {
    path: 'run/:templateId',
    loadComponent: () =>
      import('./components/task-runtime/task-runtime').then((m) => m.TaskRuntime),
  },
  // Legacy aliases — keep spike / bookmarked links working
  { path: 'jobs', redirectTo: 'tasks', pathMatch: 'full' },
  { path: 'jobs/:taskId', redirectTo: 'tasks/:taskId' },
];
