import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'builder', pathMatch: 'full' },
  {
    path: 'builder',
    loadComponent: () =>
      import('./drag-drop-editor/drag-drop-editor').then((m) => m.DragDropEditorComponent),
  },
  {
    path: 'run/:templateId',
    loadComponent: () =>
      import('./components/task-runtime/task-runtime').then((m) => m.TaskRuntime),
  },
  {
    path: 'jobs',
    loadComponent: () =>
      import('./components/job-list/job-list').then((m) => m.JobList),
  },
];
