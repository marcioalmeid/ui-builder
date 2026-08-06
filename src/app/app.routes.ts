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
    path: 'knowledge',
    loadComponent: () =>
      import('./components/knowledge-assistant/knowledge-assistant').then((m) => m.KnowledgeAssistant),
  },
  {
    path: 'jobs',
    loadComponent: () =>
      import('./components/job-list/job-list').then((m) => m.JobList),
  },
];
