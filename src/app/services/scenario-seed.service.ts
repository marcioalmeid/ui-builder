import { Injectable, inject } from '@angular/core';
import {
  buildAllScenarioPacks,
  ScenarioPack,
} from '../catalog/scenario-seeds';
import { FormService } from './form.services';
import { JobRepository } from './job.repository';
import { MigrationLedgerService, TemplateLedger } from './migration-ledger.service';

/** Stores the currently loaded spike pack id (never "all at once"). */
export const SCENARIO_SEED_KEY = 'ui-builder-scenarios-v2';
const LEGACY_SCENARIO_SEED_KEY = 'ui-builder-scenarios-v1';

@Injectable({
  providedIn: 'root',
})
export class ScenarioSeedService {
  private forms = inject(FormService);
  private jobs = inject(JobRepository);
  private ledger = inject(MigrationLedgerService);

  listPacks(): ScenarioPack[] {
    return buildAllScenarioPacks();
  }

  currentPackId(): string | null {
    return localStorage.getItem(SCENARIO_SEED_KEY);
  }

  /**
   * Installs exactly one spike scenario.
   * Replaces any existing template (and its jobs/ledger) for that pack's context
   * so the "one active template per department" rule is never violated.
   */
  installScenario(packId: string): ScenarioPack | undefined {
    const pack = this.listPacks().find((item) => item.id === packId);
    if (!pack) return undefined;

    const context = pack.template.context;
    const removedIds = this.forms
      .templates()
      .filter((template) => template.context === context)
      .map((template) => template.id);

    const keptTemplates = this.forms
      .templates()
      .filter((template) => template.context !== context);

    const keptJobs = this.jobs
      .list()
      .filter((job) => !removedIds.includes(job.templateId));
    if (pack.job) {
      keptJobs.push(pack.job);
    }

    const nextLedgers: Record<string, TemplateLedger> = {};
    for (const template of keptTemplates) {
      nextLedgers[template.id] = this.ledger.get(template.id);
    }
    nextLedgers[pack.template.id] = pack.ledger;

    this.ledger.replaceAll(nextLedgers);
    this.jobs.replaceAll(keptJobs);
    this.forms.replaceAllTemplates(
      [...keptTemplates, pack.template],
      pack.template.id
    );

    localStorage.setItem(SCENARIO_SEED_KEY, pack.id);
    localStorage.removeItem(LEGACY_SCENARIO_SEED_KEY);
    return pack;
  }

  /** @deprecated Use installScenario — kept for call-site migration. */
  installAll(): ScenarioPack[] {
    const pack = this.installScenario('s1-baseline');
    return pack ? [pack] : [];
  }

  /**
   * Repair storage that still has multiple templates per context
   * (e.g. legacy installAll of S0–S8).
   */
  repairIfNeeded(): void {
    const legacy = localStorage.getItem(LEGACY_SCENARIO_SEED_KEY);
    const hasDupes = this.forms.hasDuplicateContexts();
    if (legacy === '1' || hasDupes) {
      this.installScenario('s1-baseline');
    }
  }
}
