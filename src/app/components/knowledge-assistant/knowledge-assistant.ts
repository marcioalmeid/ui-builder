import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { KnowledgeAnswer, KnowledgeService } from '../../services/knowledge.service';

@Component({
  selector: 'app-knowledge-assistant',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './knowledge-assistant.html',
  styleUrl: './knowledge-assistant.css',
})
export class KnowledgeAssistant {
  private knowledge = inject(KnowledgeService);

  question = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<KnowledgeAnswer | null>(null);
  indexPoints = signal<number | null>(null);

  ngOnInit() {
    this.knowledge.status().then(
      (s) => this.indexPoints.set(s.points),
      () => this.indexPoints.set(null)
    );
  }

  async ask() {
    const q = this.question.trim();
    if (q.length < 3) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      this.result.set(await this.knowledge.ask(q));
    } catch {
      this.error.set('AI service indisponivel. Rode apps/ai na porta 8000.');
    } finally {
      this.loading.set(false);
    }
  }

  async syncIndex() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.knowledge.reindexIncremental();
      this.indexPoints.set(r.points);
    } catch {
      this.error.set('Falha ao reindexar.');
    } finally {
      this.loading.set(false);
    }
  }
}
