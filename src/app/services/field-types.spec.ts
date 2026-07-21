import { TestBed } from '@angular/core/testing';

import { FieldTypes } from './field-types';

describe('FieldTypes', () => {
  let service: FieldTypes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FieldTypes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
