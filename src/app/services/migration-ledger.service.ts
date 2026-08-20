import { Injectable, signal } from '@angular/core';
import { FieldDiffEvent, PublishDiff, RuleDiffEvent } from '../utils/retroactivity';

const STORAGE_KEY = 'ui-builder-migration-v1';

export interface TemplateLedger {
  fieldEvents: FieldDiffEvent[];
  ruleEvents: RuleDiffEvent[];
}

interface AllLedgers {
  [templateId: string]: TemplateLedger;
}

@Injectable({
  providedIn: 'root',
})
export class MigrationLedgerService {
  private revision = signal(0);

  get(templateId: string): TemplateLedger {
    this.revision();
    return this.read()[templateId] ?? { fieldEvents: [], ruleEvents: [] };
  }

  append(templateId: string, diff: PublishDiff): TemplateLedger {
    const all = this.read();
    const current = all[templateId] ?? { fieldEvents: [], ruleEvents: [] };
    const next: TemplateLedger = {
      fieldEvents: [...current.fieldEvents, ...diff.fieldEvents],
      ruleEvents: diff.ruleEvent
        ? [...current.ruleEvents, diff.ruleEvent]
        : current.ruleEvents,
    };
    all[templateId] = next;
    this.write(all);
    return next;
  }

  replaceAll(ledgers: Record<string, TemplateLedger>) {
    this.write(ledgers);
  }

  private read(): AllLedgers {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as AllLedgers;
    } catch {
      return {};
    }
  }

  private write(all: AllLedgers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.revision.update((n) => n + 1);
  }
}
