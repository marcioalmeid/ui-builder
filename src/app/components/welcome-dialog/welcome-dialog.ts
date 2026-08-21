import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './welcome-dialog.html',
})
export class WelcomeDialog {
  private dialogRef = inject(MatDialogRef<WelcomeDialog>);

  dismiss() {
    this.dialogRef.close();
  }
}
