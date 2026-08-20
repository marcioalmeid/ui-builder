import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TASK_TEMPLATE_CONTEXTS } from '../../models/task-template';
import { FormService } from '../../services/form.services';

@Component({
  selector: 'app-new-template-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './new-template-dialog.html',
})
export class NewTemplateDialog {
  private dialogRef = inject(MatDialogRef<NewTemplateDialog, string | false>);
  private formService = inject(FormService);

  name = '';
  error = signal<string | null>(null);

  availableContexts = computed(() =>
    TASK_TEMPLATE_CONTEXTS.filter((ctx) => !this.formService.isContextTaken(ctx.id))
  );

  context = this.availableContexts()[0]?.id ?? '';

  createBlank() {
    this.error.set(null);
    if (!this.context) {
      this.error.set('No free department available.');
      return;
    }
    const templateName = this.name.trim() || 'New Task Template';
    const result = this.formService.createTemplate(templateName, this.context);
    if (!result.success) {
      this.error.set(result.error ?? 'Could not create template.');
      return;
    }
    this.dialogRef.close(this.formService.activeTemplateId());
  }

  startFromDemo() {
    this.error.set(null);
    const demo = this.formService
      .templates()
      .find(
        (t) =>
          t.name.includes('New Task') && !t.name.startsWith('[S')
      );
    if (!demo) {
      this.error.set(
        'Demo template not found. Create a blank template in a free department instead.'
      );
      return;
    }
    const result = this.formService.cloneTemplate(demo.id);
    if (!result.success) {
      this.error.set(result.error ?? 'Could not duplicate demo.');
      return;
    }
    this.formService.focusSidebarSection('fields');
    this.dialogRef.close(this.formService.activeTemplateId());
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
