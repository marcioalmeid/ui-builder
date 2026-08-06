import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownList } from './dropdown-list';

describe('DropdownList', () => {
  let component: DropdownList;
  let fixture: ComponentFixture<DropdownList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownList]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DropdownList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: 'test',
      type: 'dropdown',
      label: 'Test label',
      icon: 'arrow_drop_down',
      required: false,
      options: [],
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});