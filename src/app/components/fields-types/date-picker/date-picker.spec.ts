import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  let component: DatePicker;
  let fixture: ComponentFixture<DatePicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(DatePicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: 'test',
      type: 'datepicker',
      label: 'Test label',
      icon: 'calendar_today',
      required: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
