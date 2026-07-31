import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormService } from '../../services/form.services';
import { DataCatalogService } from '../../services/data-catalog.service';
import { buildDataChecklist } from '../../utils/publish-summary';
import { getAllFields } from '../../utils/template-readiness';

@Component({
  selector: 'app-data-checklist',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './data-checklist.html',
  styleUrl: './data-checklist.css',
})
export class DataChecklist {
  formService = inject(FormService);
  private catalogService = inject(DataCatalogService);

  items = computed(() =>
    buildDataChecklist(this.formService.rows(), this.catalogService)
  );

  hasFields = computed(() => getAllFields(this.formService.rows()).length > 0);

  selectedFieldId = computed(() => this.formService.selectedField()?.id);

  selectField(fieldId: string) {
    this.formService.setSelectedField(fieldId);
  }
}
