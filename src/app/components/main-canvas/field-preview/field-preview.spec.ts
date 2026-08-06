import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldPreview } from './field-preview';

describe('FieldPreview', () => {
  let component: FieldPreview;
  let fixture: ComponentFixture<FieldPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldPreview);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: 'test',
      type: 'text',
      label: 'Test label',
      icon: 'text_fields',
      required: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
