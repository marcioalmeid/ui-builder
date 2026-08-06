import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextField } from './text-field';

describe('TextField', () => {
  let component: TextField;
  let fixture: ComponentFixture<TextField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextField],
    }).compileComponents();

    fixture = TestBed.createComponent(TextField);
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
