import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { PublishSummary } from '../../utils/publish-summary';
import { RiskPolicy } from '../../models/task-template';
import {
  autoApplyOnPublish,
  FieldDiffEvent,
  JobMigrationState,
  layoutEventAutoApplies,
  migrateJobFully,
  PublishDiff,
  RuleDiffEvent,
} from '../../utils/retroactivity';

export interface PublishJobRow extends JobMigrationState {
  id: string;
  label: string;
}

export interface PublishConfirmData {
  templateName: string;
  summary: PublishSummary;
  errors: string[];
  nextVersion: number;
  jobCount: number;
  jobs: PublishJobRow[];
  /** Ledger before this publish (for Migrate preview). */
  ledger: { fieldEvents: FieldDiffEvent[]; ruleEvents: RuleDiffEvent[] };
  diff: PublishDiff;
  riskPolicy: RiskPolicy;
  /** fieldId → label (includes removed fields from previous version). */
  fieldLabels?: Record<string, string>;
  reuseError?: string;
}

export interface PublishConfirmResult {
  confirmed: true;
  riskPolicy: RiskPolicy;
  /** Apply one Migrate step to each affected job right after publish. */
  migrateNow: boolean;
}

type DialogStep = 'review' | 'migrate';

@Component({
  selector: 'app-publish-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatRadioModule, FormsModule],
  templateUrl: './publish-confirm-dialog.html',
  styleUrl: './publish-confirm-dialog.css',
})
export class PublishConfirmDialog {
  data = inject<PublishConfirmData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PublishConfirmDialog, PublishConfirmResult | undefined>);

  policy = signal<RiskPolicy>(this.data.riskPolicy);
  step = signal<DialogStep>('review');
  migrateNow = signal(true);

  /** Per-job outcome of this publish under the selected policy. */
  jobOutcomes = computed(() => {
    const policy = this.policy();
    const diff = this.data.diff;
    const fieldEvents = [...this.data.ledger.fieldEvents, ...diff.fieldEvents];
    const ruleEvents = diff.ruleEvent
      ? [...this.data.ledger.ruleEvents, diff.ruleEvent]
      : this.data.ledger.ruleEvents;

    return this.data.jobs.map((job) => {
      const afterPublish = autoApplyOnPublish(job, diff, policy);
      const pendingLayout = diff.fieldEvents.some(
        (event) => !(afterPublish.appliedFieldEventIds ?? []).includes(event.id)
      );
      const pendingBehavior = Boolean(
        diff.ruleEvent && !(afterPublish.appliedRuleEventIds ?? []).includes(diff.ruleEvent.id)
      );
      const needsMigrate = pendingLayout || pendingBehavior;
      const afterMigrate = needsMigrate
        ? migrateJobFully(afterPublish, fieldEvents, ruleEvents)
        : afterPublish;

      return {
        id: job.id,
        label: job.label,
        pinBefore: job.templateVersion ?? 0,
        pinAfterPublish: afterPublish.templateVersion ?? 0,
        pinAfterMigrate: afterMigrate.templateVersion ?? 0,
        needsMigrate,
        stillBehindAfterMigrate: false,
        behaviorApplied: Boolean(
          diff.ruleEvent && (afterPublish.appliedRuleEventIds ?? []).includes(diff.ruleEvent.id)
        ),
      };
    });
  });

  migrateJobs = computed(() => this.jobOutcomes().filter((item) => item.needsMigrate));

  migrateNeededCount = computed(() => this.migrateJobs().length);

  behaviorAutoCount = computed(
    () => this.jobOutcomes().filter((item) => item.behaviorApplied).length
  );

  showMigrateStep = computed(() => this.migrateNeededCount() > 0);

  fieldRows = computed(() =>
    this.data.diff.fieldEvents.map((event) => ({
      event,
      auto: layoutEventAutoApplies(event, this.policy()),
      title: this.fieldTitle(event),
      detail: this.fieldDetail(event),
    }))
  );

  ruleRow = computed(() => {
    const event = this.data.diff.ruleEvent;
    if (!event) return null;
    const autoJobs = this.behaviorAutoCount();
    return {
      event,
      auto: autoJobs > 0,
      autoJobs,
      title: this.ruleTitle(event),
      tag:
        autoJobs === 0
          ? 'Migrate +1'
          : autoJobs === this.data.jobs.length
            ? 'auto-apply'
            : `auto ${autoJobs}/${this.data.jobs.length}`,
    };
  });

  hasDryRun = computed(() => this.fieldRows().length > 0 || !!this.ruleRow());

  isFirstPublish = this.data.nextVersion === 1 && this.data.jobCount === 0;

  primaryLabel = computed(() => {
    if (this.step() === 'review' && this.showMigrateStep()) return 'Continue';
    if (this.migrateNow() && this.showMigrateStep()) {
      return `Publish + catch up (${this.migrateNeededCount()})`;
    }
    return 'Publish';
  });

  goNext() {
    if (this.data.errors.length > 0 || this.data.reuseError) return;

    if (this.step() === 'review' && this.showMigrateStep()) {
      this.step.set('migrate');
      return;
    }

    this.dialogRef.close({
      confirmed: true,
      riskPolicy: this.policy(),
      migrateNow: this.showMigrateStep() ? this.migrateNow() : false,
    });
  }

  goBack() {
    this.step.set('review');
  }

  openMigrateStep() {
    if (!this.showMigrateStep()) return;
    this.step.set('migrate');
  }

  cancel() {
    this.dialogRef.close(undefined);
  }

  private fieldTitle(event: FieldDiffEvent): string {
    const fromMap = this.data.fieldLabels?.[event.fieldId]?.trim();
    if (fromMap) return fromMap;

    if (event.patch.kind === 'add') {
      return event.patch.field.label?.trim() || 'New field';
    }
    if (event.patch.kind === 'upsert') {
      const label = event.patch.changes.label?.trim();
      if (label) return label;
    }
    return 'Unknown field';
  }

  private fieldDetail(event: FieldDiffEvent): string {
    switch (event.patch.kind) {
      case 'add':
        return 'New field';
      case 'remove':
        return 'Removed';
      case 'upsert':
        return event.class === 'COSMETIC' ? 'Label / hint' : 'Field update';
    }
  }

  private ruleTitle(event: RuleDiffEvent): string {
    return `Rules v${event.fromVersion} → v${event.toVersion}`;
  }
}
