import {
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  CostBreakdownFee,
  CostBreakdownValue,
  FormField,
} from '../../../models/field';

const EMPTY_VALUE = (): CostBreakdownValue => ({
  grossBudget: '',
  managementFeePercent: '',
  additionalFees: [],
});

function normalizeValue(
  value: CostBreakdownValue | null | undefined
): CostBreakdownValue {
  if (!value) {
    return EMPTY_VALUE();
  }
  return {
    grossBudget:
      value.grossBudget === '' || value.grossBudget == null ? '' : value.grossBudget,
    managementFeePercent:
      value.managementFeePercent === '' || value.managementFeePercent == null
        ? ''
        : value.managementFeePercent,
    additionalFees: (value.additionalFees ?? []).map((fee) => ({
      id: fee.id || crypto.randomUUID(),
      label: fee.label ?? '',
      amount: fee.amount ?? 0,
    })),
  };
}

@Component({
  selector: 'app-cost-breakdown',
  templateUrl: './cost-breakdown.html',
  styleUrl: './cost-breakdown.css',
})
export class CostBreakdown {
  field = input.required<FormField>();
  value = input<CostBreakdownValue | null>(null);
  valueChange = output<CostBreakdownValue>();
  onValueChange = input<(value: CostBreakdownValue) => void>();

  /** Local writable state so Add/Remove fees update UI even if the parent binding lags. */
  state = linkedSignal({
    source: this.value,
    computation: (value) => normalizeValue(value),
  });

  grossAmount = computed(() => this.toNumber(this.state().grossBudget));

  managementFeeAmount = computed(() => {
    const percent = this.toNumber(this.state().managementFeePercent);
    return (this.grossAmount() * percent) / 100;
  });

  flatFeesTotal = computed(() =>
    this.state().additionalFees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0)
  );

  netAdSpend = computed(
    () => this.grossAmount() - this.flatFeesTotal() - this.managementFeeAmount()
  );

  emit(next: CostBreakdownValue) {
    const normalized = normalizeValue(next);
    this.state.set(normalized);
    this.valueChange.emit(normalized);
    this.onValueChange()?.(normalized);
  }

  onGrossChange(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const grossBudget = raw === '' ? '' : Number(raw);
    this.emit({ ...this.state(), grossBudget });
  }

  onFeePercentChange(event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const managementFeePercent = raw === '' ? '' : Number(raw);
    this.emit({ ...this.state(), managementFeePercent });
  }

  onFeeLabelChange(index: number, event: Event) {
    const label = (event.target as HTMLInputElement).value;
    const additionalFees = this.state().additionalFees.map((fee, i) =>
      i === index ? { ...fee, label } : fee
    );
    this.emit({ ...this.state(), additionalFees });
  }

  onFeeAmountChange(index: number, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const amount = raw === '' ? 0 : Number(raw);
    const additionalFees = this.state().additionalFees.map((fee, i) =>
      i === index ? { ...fee, amount } : fee
    );
    this.emit({ ...this.state(), additionalFees });
  }

  addFee() {
    const fee: CostBreakdownFee = {
      id: crypto.randomUUID(),
      label: '',
      amount: 0,
    };
    this.emit({
      ...this.state(),
      additionalFees: [...this.state().additionalFees, fee],
    });
  }

  removeFee(index: number) {
    const additionalFees = this.state().additionalFees.filter((_, i) => i !== index);
    this.emit({ ...this.state(), additionalFees });
  }

  /** Positive currency, e.g. $0 or $5.9 */
  formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 1,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /** Deduction line, e.g. -$5.9 or -$0 */
  formatDeduction(amount: number): string {
    return `-${this.formatMoney(Math.abs(amount))}`;
  }

  /** Net line — keep sign on the number ($-5.9 style when negative). */
  formatNet(amount: number): string {
    if (amount < 0) {
      return `$-${this.formatMoney(Math.abs(amount)).replace(/^\$/, '')}`;
    }
    return this.formatMoney(amount);
  }

  private toNumber(value: number | ''): number {
    if (value === '' || value == null) return 0;
    return Number(value) || 0;
  }
}
