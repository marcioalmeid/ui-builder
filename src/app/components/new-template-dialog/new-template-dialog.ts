import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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

  availableDepartments = computed(() =>
    this.formService.availableDepartments().filter(
      (dept) => !this.formService.isDepartmentTaken(dept)
    )
  );

  selectedDepartment = this.availableDepartments()[0] ?? '';

  createBlank() {
    this.error.set(null);
    if (!this.selectedDepartment) {
      this.error.set('No free department available.');
      return;
    }
    const templateName = this.name.trim() || 'New Task Template';
    const result = this.formService.createTemplate(
      templateName,
      [this.selectedDepartment]
    );
    if (!result.success) {
      this.error.set(result.error ?? 'Could not create template.');
      return;
    }
    this.dialogRef.close(this.formService.activeTemplateId());
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
