import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { FormEditorComponent } from './form-editor.component';
import { FormService } from '../../../services/form.services';
import { FieldTypeDefinition } from '../../../models/field';

describe('FormEditorComponent', () => {
  let component: FormEditorComponent;
  let fixture: ComponentFixture<FormEditorComponent>;
  let formService: FormService;

  const textFieldType: FieldTypeDefinition = {
    id: 'text',
    type: 'text',
    label: 'Text field',
    icon: 'text_fields',
    defaultConfig: {
      label: 'Text field',
      placeholder: 'Enter text',
      required: false,
    },
    component: class {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormEditorComponent],
    }).compileComponents();

    formService = TestBed.inject(FormService);
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a field when dropping from the field selector', () => {
    const rowId = formService.rows()[0].id;
    const dragItem = { data: textFieldType } as CdkDrag<FieldTypeDefinition>;

    component.onDropInRow(
      {
        previousContainer: 'field-selector',
        container: rowId,
        item: dragItem,
        currentIndex: 0,
        previousIndex: 0,
        isPointerOverContainer: true,
        distance: { x: 0, y: 0 },
        dropPoint: { x: 0, y: 0 },
        event: new MouseEvent('mouseup'),
      } as unknown as CdkDragDrop<string>,
      rowId,
    );

    expect(formService.rows()[0].fields).toHaveLength(1);
    expect(formService.rows()[0].fields[0].type).toBe('text');
  });

  it('should delete a field from a row', () => {
    const rowId = formService.rows()[0].id;
    const fieldId = crypto.randomUUID();

    formService.addField(
      {
        id: fieldId,
        type: 'text',
        label: 'Text field',
        icon: 'text_fields',
        required: false,
      },
      rowId,
    );

    component.onDeleteField(fieldId, rowId);

    expect(formService.rows()[0].fields).toHaveLength(0);
  });
});
