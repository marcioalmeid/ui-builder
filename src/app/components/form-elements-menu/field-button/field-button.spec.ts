import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldButton } from './field-button';

describe('FieldButton', () => {
  let component: FieldButton;
  let fixture: ComponentFixture<FieldButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldButton],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldButton);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: 'text',
      type: 'text',
      label: 'Text',
      icon: 'text_fields',
      defaultConfig: {},
      settingsConfig: [],
      component: class {},
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
