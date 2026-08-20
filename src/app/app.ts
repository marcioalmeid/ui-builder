import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { ScenarioSeedService } from './services/scenario-seed.service';
import { JobService } from './services/job.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  protected readonly title = signal('ui-builder');
  private readonly scenarios = inject(ScenarioSeedService);
  private readonly jobs = inject(JobService);

  ngOnInit() {
    // Collapse legacy multi-template-per-context spike installs.
    this.scenarios.repairIfNeeded();
    this.jobs.pruneOrphanJobs();
  }
}
