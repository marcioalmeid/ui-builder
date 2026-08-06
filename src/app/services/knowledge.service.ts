import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface KnowledgeSource {
  path: string;
  snippet: string;
  method: string;
}

export interface KnowledgeAnswer {
  answer: string;
  model: string;
  sources: KnowledgeSource[];
  confidence: string;
}

export interface IndexStatus {
  indexed: boolean;
  points: number;
  files_tracked: number;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private http = inject(HttpClient);
  private base = '/ai';

  health() {
    return firstValueFrom(this.http.get<Record<string, unknown>>(`${this.base}/health`));
  }

  status() {
    return firstValueFrom(this.http.get<IndexStatus>(`${this.base}/index/status`));
  }

  reindexIncremental() {
    return firstValueFrom(
      this.http.post<{ updated: string[]; points: number }>(`${this.base}/index/incremental`, {})
    );
  }

  ask(question: string) {
    return firstValueFrom(
      this.http.post<KnowledgeAnswer>(`${this.base}/ask`, { question })
    );
  }
}
