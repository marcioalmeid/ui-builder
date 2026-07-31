import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormService } from '../../services/form.services';
import {
  buildSetupSteps,
  getCurrentSetupStep,
  getNextSetupAction,
  SetupStep,
} from '../../utils/template-readiness';

@Component({
  selector: 'app-template-setup-stepper',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './template-setup-stepper.html',
  styleUrl: './template-setup-stepper.css',
})
export class TemplateSetupStepper {
  previewVisited = input(false);
  stepAction = output<SetupStep['id']>();

  private formService = inject(FormService);

  steps = computed(() =>
    buildSetupSteps(
      this.formService.activeTemplate(),
      this.formService.rows(),
      this.formService.rulesVisited(),
      this.previewVisited()
    )
  );

  currentStep = computed(() => getCurrentSetupStep(this.steps()));

  activeStepId = computed(() => this.formService.activeSetupStep());

  readyToPublish = computed((): boolean => {
    const steps = this.steps();
    return Boolean(
      steps.find((s) => s.id === 'layout')?.complete &&
        steps.find((s) => s.id === 'data')?.complete &&
        steps.find((s) => s.id === 'rules')?.complete &&
        steps.find((s) => s.id === 'preview')?.complete &&
        this.formService.activeTemplate()?.status === 'draft'
    );
  });

  nextAction = computed(() =>
    getNextSetupAction(
      this.steps(),
      this.formService.rows(),
      this.readyToPublish()
    )
  );

  onStepClick(step: SetupStep) {
    this.stepAction.emit(step.id);
  }

  onNextActionClick() {
    const action = this.nextAction();
    if (action) {
      this.stepAction.emit(action.stepId);
    }
  }
}
