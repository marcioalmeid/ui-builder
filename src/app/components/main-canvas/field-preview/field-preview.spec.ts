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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
