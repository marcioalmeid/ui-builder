import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import {
  buildApiSubmissionPayload,
  formatApiPayloadJson,
} from '../../utils/api-payload';

@Component({
  selector: 'app-dev-payload-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './dev-payload-panel.html',
  styleUrl: './dev-payload-panel.css',
})
export class DevPayloadPanel {
  embedded = input(false);

  private formService = inject(FormService);
  private catalogService = inject(DataCatalogService);

  copied = signal(false);

  payload = computed(() => {
    const template = this.formService.activeTemplate();
    if (!template) return null;

    return buildApiSubmissionPayload(
      template,
      this.formService.rows(),
      this.formService.dataBindings(),
      this.formService.workflowRules(),
      this.formService.previewJobData(),
      (catalogId) => this.catalogService.getById(catalogId)
    );
  });

  activeTemplateName = computed(() => this.formService.activeTemplate()?.name ?? 'No template');

  payloadJson = computed(() => {
    const payload = this.payload();
    return payload ? formatApiPayloadJson(payload) : '{}';
  });

  hasSimulatedData = computed(() => {
    const data = this.formService.previewJobData();
    return Object.values(data).some((value) => {
      if (value === '' || value === null || value === undefined || value === false) {
        return false;
      }
      if (typeof value === 'object' && value !== null && 'grossBudget' in value) {
        const gross = (value as { grossBudget?: unknown }).grossBudget;
        return gross !== '' && gross != null;
      }
      return true;
    });
  });

  async copyPayload() {
    await navigator.clipboard.writeText(this.payloadJson());
    this.copied.set(true);
    window.setTimeout(() => this.copied.set(false), 2000);
  }
}
