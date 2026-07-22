import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: 'field-1',
      type: 'text',
      label: 'Text field',
      icon: 'text_fields',
      required: false,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit fieldDelete with field id', () => {
    const emitted: string[] = [];
    fixture.componentInstance.fieldDelete.subscribe((fieldId) => emitted.push(fieldId));

    const button = fixture.nativeElement.querySelector('button');
    button?.click();

    expect(emitted).toEqual(['field-1']);
  });
});
