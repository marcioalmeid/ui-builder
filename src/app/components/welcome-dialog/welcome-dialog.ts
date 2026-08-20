import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormService } from '../../services/form.services';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './welcome-dialog.html',
})
export class WelcomeDialog {
  private dialogRef = inject(MatDialogRef<WelcomeDialog>);
  private formService = inject(FormService);
  private router = inject(Router);

  openDemo() {
    const demo = this.formService
      .templates()
      .find((t) => t.name.includes('New Task'));
    if (demo) {
      this.formService.switchTemplate(demo.id);
      this.formService.focusSidebarSection('fields');
      void this.router.navigate(['/builder', demo.id]);
    }
    this.dialogRef.close();
  }

  dismiss() {
    this.dialogRef.close();
  }
}
