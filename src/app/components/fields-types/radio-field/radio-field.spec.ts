import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadioField } from './radio-field';

describe('RadioField', () => {
  let component: RadioField;
  let fixture: ComponentFixture<RadioField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioField],
    }).compileComponents();

    fixture = TestBed.createComponent(RadioField);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('field', {
      id: '1',
      type: 'radio',
      label: 'Choose an option',
      icon: 'radio_button_checked',
      required: false,
      options: [
        { label: 'Option 1', value: 'option-1' },
        { label: 'Option 2', value: 'option-2' },
      ],
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render radio options', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Choose an option');
    expect(compiled.textContent).toContain('Option 1');
    expect(compiled.textContent).toContain('Option 2');
  });
});
