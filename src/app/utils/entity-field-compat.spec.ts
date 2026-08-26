import { FormField } from '../models/field';
import {
  findFieldUsingEntityPath,
  isSameEntityMappingPath,
} from './entity-field-compat';

function field(
  id: string,
  label: string,
  catalogId?: string,
  entityFieldKey?: string
): FormField {
  return {
    id,
    type: 'text',
    label,
    icon: 'text_fields',
    required: false,
    ...(catalogId
      ? { entityMapping: { catalogId, entityFieldKey: entityFieldKey ?? '' } }
      : {}),
  };
}

describe('entity mapping uniqueness', () => {
  it('matches the same catalog + entity field path', () => {
    expect(
      isSameEntityMappingPath(
        { catalogId: 'users', entityFieldKey: 'email' },
        'users',
        'email'
      )
    ).toBe(true);
    expect(
      isSameEntityMappingPath(
        { catalogId: 'users', entityFieldKey: 'name' },
        'users',
        'email'
      )
    ).toBe(false);
  });

  it('finds another field already using the entity path', () => {
    const fields = [
      field('a', 'Name', 'users', 'name'),
      field('b', 'Company', 'task-types', 'description'),
      field('c', 'Email', 'users', 'email'),
    ];

    expect(findFieldUsingEntityPath(fields, 'users', 'name')?.id).toBe('a');
    expect(findFieldUsingEntityPath(fields, 'users', 'name', 'a')).toBeUndefined();
    expect(findFieldUsingEntityPath(fields, 'users', 'email', 'c')?.id).toBeUndefined();
    expect(findFieldUsingEntityPath(fields, 'task-types', 'description', 'a')?.label).toBe(
      'Company'
    );
  });
});
