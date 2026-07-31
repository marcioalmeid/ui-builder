import { Component, inject } from '@angular/core';
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
  private dialogRef = inject(MatDialogRef<NewTemplateDialog>);
  private formService = inject(FormService);

  contexts = TASK_TEMPLATE_CONTEXTS;
  name = '';
  context = 'general';

  createBlank() {
    const templateName = this.name.trim() || 'New Task Template';
    this.formService.createTemplate(templateName, this.context);
    this.dialogRef.close(true);
  }

  startFromDemo() {
    this.formService.cloneTemplate(
      this.formService.templates().find((t) => t.name.includes('New Task'))?.id
    );
    this.formService.focusSidebarSection('fields');
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
