import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Department = string;

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly _departments = signal<Department[]>([]);

  public readonly departments = this._departments.asReadonly();

  loadDepartments(): void {
    this.http.get<Department[]>('/api/job-departments').subscribe({
      next: (data) => this._departments.set(data),
      error: () => this._departments.set([]),
    });
  }
}
