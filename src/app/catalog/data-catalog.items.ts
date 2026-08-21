import { ApiDataSource } from '../models/field';
import { EntityFieldDefinition } from '../models/entity-field';

export interface DataCatalogItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  contexts?: string[];
  dataSource: ApiDataSource;
  entityFields: EntityFieldDefinition[];
}

const ID_NAME: EntityFieldDefinition[] = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
   
  { key: 'due_date', label: 'Due Date', type: 'date' },

];

/** Catalog sources available in the data picker (mock API: /api/* → /catalog/*.json). */
export const DATA_CATALOG: DataCatalogItem[] = [
  {
    id: 'users',
    name: 'Users',
    description: 'Operators assigned to the task',
    icon: 'people',
    category: 'People',
    contexts: ['general', 'advertising', 'print', 'social'],
    dataSource: { 
      url: '/api/users',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
    ],
  },
  {
    id: 'task-types',
    name: 'Task Types',
    description: 'Digital Advertising, Print, Social, General',
    icon: 'assignment',
    category: 'Tasks',
    contexts: ['general', 'advertising', 'print', 'social'],
    dataSource: {
      url: '/api/task-types',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: ID_NAME,
  },
  {
    id: 'platforms',
    name: 'Platforms',
    description: 'Where the campaign runs',
    icon: 'devices',
    category: 'Advertising',
    contexts: ['advertising'],
    dataSource: {
      url: '/api/platforms',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: ID_NAME,
  },
  {
    id: 'request-types',
    name: 'Request Types',
    description: 'What needs to happen on the campaign',
    icon: 'list_alt',
    category: 'Advertising',
    contexts: ['advertising'],
    dataSource: {
      url: '/api/request-types',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: ID_NAME,
  },
  {
    id: 'vendors',
    name: 'Vendors',
    description: 'External vendors for media buys',
    icon: 'store',
    category: 'Advertising',
    contexts: ['advertising'],
    dataSource: {
      url: '/api/vendors',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: ID_NAME,
  },
  {
    id: 'budget-line-items',
    name: 'Budget Line Items',
    description: 'Budget lines for spend tracking',
    icon: 'payments',
    category: 'Advertising',
    contexts: ['advertising'],
    dataSource: {
      url: '/api/budget-line-items',
      method: 'GET',
      labelKey: 'name',
      valueKey: 'id',
    },
    entityFields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
    ],
  },
];
