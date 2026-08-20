import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenarioSeedService } from './scenario-seed.service';
import { FormService } from './form.services';
import { JobService } from './job.service';

describe('ScenarioSeedService', () => {
  let scenarios: ScenarioSeedService;
  let forms: FormService;
  let jobs: JobService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    scenarios = TestBed.inject(ScenarioSeedService);
    forms = TestBed.inject(FormService);
    jobs = TestBed.inject(JobService);
  });

  it('installs one scenario without duplicating advertising context', () => {
    scenarios.installScenario('s1-baseline');
    scenarios.installScenario('s5-migrated-v3');

    const advertising = forms
      .templates()
      .filter((template) => template.context === 'advertising');
    expect(advertising).toHaveLength(1);
    expect(advertising[0].name.startsWith('[S5]')).toBe(true);
    expect(forms.hasDuplicateContexts()).toBe(false);
  });

  it('keeps only the seed job for the loaded scenario context', () => {
    scenarios.installScenario('s1-baseline');
    const afterS1 = jobs.listByTemplate(
      forms.findTemplateByContext('advertising')!.id
    );
    expect(afterS1).toHaveLength(1);

    scenarios.installScenario('s3-barrier');
    const advertisingId = forms.findTemplateByContext('advertising')!.id;
    expect(jobs.listByTemplate(advertisingId)).toHaveLength(1);
    expect(jobs.list().every((job) => job.templateId === advertisingId || forms.getTemplate(job.templateId)?.context !== 'advertising')).toBe(
      true
    );
  });
});
