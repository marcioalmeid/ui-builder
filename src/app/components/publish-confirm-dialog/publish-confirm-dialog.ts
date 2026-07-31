import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PublishSummary } from '../../utils/publish-summary';

export interface PublishConfirmData {
  templateName: string;
  summary: PublishSummary;
  errors: string[];
}

@Component({
  selector: 'app-publish-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './publish-confirm-dialog.html',
})
export class PublishConfirmDialog {
  data = inject<PublishConfirmData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PublishConfirmDialog>);

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
