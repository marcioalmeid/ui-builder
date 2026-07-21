import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldSettings } from './field-settings';

describe('FieldSettings', () => {
  let component: FieldSettings;
  let fixture: ComponentFixture<FieldSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
