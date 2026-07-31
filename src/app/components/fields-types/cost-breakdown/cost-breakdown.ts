import { Component, computed, effect, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import {
  CostBreakdownFee,
  CostBreakdownValue,
  FormField,
} from '../../../models/field';
import { bindFieldOptions } from '../../../utils/data-bound-options';
import { usesApiDataSource } from '../../../utils/field-data-binding';

const EMPTY_VALUE = (): CostBreakdownValue => ({
  grossBudget: '',
  managementFeePercent: 15,
  additionalFees: [],
});

@Component({
  selector: 'app-cost-breakdown',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './cost-breakdown.html',
  styleUrl: './cost-breakdown.css',
})
export class CostBreakdown {
  field = input.required<FormField>();
  value = input<CostBreakdownValue | null>(null);
  valueChange = output<CostBreakdownValue>();
  onValueChange = input<(value: CostBreakdownValue) => void>();

  usesApi = computed(() => usesApiDataSource(this.field()));

  private boundOptions = bindFieldOptions(this.field);
  catalogOptions = this.boundOptions.options;

  state = computed(() => {
    const current = this.value();
    if (!current) {
      return {
        ...EMPTY_VALUE(),
        managementFeePercent: this.field().managementFeePercent ?? 15,
      };
    }
    return current;
  });

  constructor() {
    effect(() => {
      if (!this.usesApi()) return;

      const options = this.catalogOptions();
      if (!options.length) return;

      const current = this.state();
      if (current.additionalFees.length > 0) return;

      this.emit({
        ...current,
        additionalFees: options.map((option) => ({
          label: option.label,
          amount: 0,
        })),
      });
    });
  }

  managementFeeAmount = computed(() => {
    const gross = this.toNumber(this.state().grossBudget);
    return (gross * this.state().managementFeePercent) / 100;
  });

  additionalFeesTotal = computed(() =>
    this.state().additionalFees.reduce((sum, fee) => sum + (fee.amount || 0), 0)
  );

  netAdSpend = computed(() => {
    const gross = this.toNumber(this.state().grossBudget);
    return gross - this.managementFeeAmount() - this.additionalFeesTotal();
  });

  emit(next: CostBreakdownValue) {
    this.valueChange.emit(next);
    this.onValueChange()?.(next);
  }

  onGrossChange(raw: string) {
    const grossBudget = raw === '' ? '' : Number(raw);
    this.emit({ ...this.state(), grossBudget });
  }

  onFeePercentChange(raw: string) {
    const managementFeePercent = Number(raw) || 0;
    this.emit({ ...this.state(), managementFeePercent });
  }

  onFeeLabelChange(index: number, label: string) {
    const additionalFees = this.state().additionalFees.map((fee, i) =>
      i === index ? { ...fee, label } : fee
    );
    this.emit({ ...this.state(), additionalFees });
  }

  onFeeAmountChange(index: number, raw: string) {
    const amount = Number(raw) || 0;
    const additionalFees = this.state().additionalFees.map((fee, i) =>
      i === index ? { ...fee, amount } : fee
    );
    this.emit({ ...this.state(), additionalFees });
  }

  addFee() {
    const additionalFees = [
      ...this.state().additionalFees,
      { label: 'Additional fee', amount: 0 },
    ];
    this.emit({ ...this.state(), additionalFees });
  }

  removeFee(index: number) {
    const additionalFees = this.state().additionalFees.filter((_, i) => i !== index);
    this.emit({ ...this.state(), additionalFees });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private toNumber(value: number | ''): number {
    if (value === '') return 0;
    return Number(value) || 0;
  }
}
