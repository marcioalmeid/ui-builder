import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormPreview } from './form-preview';

describe('FormPreview', () => {
  let component: FormPreview;
  let fixture: ComponentFixture<FormPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(FormPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
