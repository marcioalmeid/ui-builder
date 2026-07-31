import { ApiDataSource } from './field';

export interface DataBinding {
  id: string;
  name: string;
  dataSource: ApiDataSource;
  dataCatalogId?: string;
  targetFieldIds: string[];
}
