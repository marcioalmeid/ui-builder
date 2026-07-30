# Guia para Criação e Ativação de Componentes no Form Builder

## 1. Estrutura do Projeto

### Localização dos Componentes
- **Componentes de campos**: `src/app/components/fields-types/`
- **Serviço de tipos de campo**: `src/app/services/field-types.service.ts`
- **Preview de campos**: `src/app/components/main-canvas/field-preview/`

## 2. Passos para Criar um Novo Componente

### 2.1 Criar Diretório do Componente
```bash
mkdir -p src/app/components/fields-types/novo-componente
```

### 2.2 Criar Arquivos do Componente

#### Arquivo TypeScript (`text-area.component.ts`):
```typescript
import { Component, input, output } from '@angular/core';
import { FormField } from '../../../models/field';

@Component({
  selector: 'app-text-area',
  templateUrl: './text-area.component.html',
  styleUrls: ['./text-area.component.scss']
})
export class TextAreaComponent {
  field = input.required<FormField>();
  valueChange = output<string>();

  onInputChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(value);
  }
}
```

#### Arquivo HTML (`text-area.component.html`):
```html
<div class="flex flex-col gap-1">
  <label *ngIf="field().label" [for]="'textarea-' + field().id" class="text-sm font-medium text-surface-variant">
    {{ field().label }}
  </label>
  <textarea
    [id]="'textarea-' + field().id"
    [placeholder]="field().placeholder || ''"
    (input)="onInputChange($event)"
    class="w-full px-3 py-2 bg-neutral10 border border-outline-variant rounded-lg text-plain-font-family text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
    rows="3">
  </textarea>
</div>
```

#### Arquivo SCSS (`text-area.component.scss`):
```scss
// Estilos específicos do componente
```

### 2.3 Registrar o Tipo de Campo no Serviço

#### No arquivo `field-types.service.ts`:
```typescript
const TEXTAREA_FIELD_TYPE: FieldTypeDefinition = {
  id: 'textarea',
  type: 'textarea',
  label: 'Text area',
  icon: 'format_textdirection_l_to_r',
  defaultConfig: {
    label: 'Text area',
    placeholder: 'Enter text',
    required: false,
  },
  settingsConfig: [
    { type: 'text', key: 'label', label: 'Label' },
    { type: 'text', key: 'placeholder', label: 'Placeholder' },
    { type: 'checkbox', key: 'required', label: 'Required' },
  ],
  component: TextAreaComponent,
};

// Adicionar ao mapa de fieldTypes:
['textarea', TEXTAREA_FIELD_TYPE],
```

## 3. Verificação de Integração

### 3.1 Verificar Componente no Preview
O componente deve ser renderizado corretamente no `FieldPreview`:

```typescript
// src/app/components/main-canvas/field-preview/field-preview.ts
export class FieldPreview {
    field = input.required<FormField>();
    fieldTypeService = inject(FieldTypeService); 

    previewComponent = computed(() => {
        const type = this.fieldTypeService.getFieldType(this.field().type);
        return type?.component ?? null;
    });
}
```

### 3.2 Template do Preview
```html
<!-- src/app/components/main-canvas/field-preview/field-preview.html -->
<div class="p-6">
  <ng-container 
    [ngComponentOutlet]="previewComponent()"
    [ngComponentOutletInputs]="{ field: field() }" />
</div>
```

## 4. Testes e Validação

### 4.1 Verificar Componente no Form Builder
1. Adicionar o novo campo ao formulário
2. Verificar se o campo aparece corretamente no preview
3. Testar a edição do campo
4. Verificar exportação do formulário

### 4.2 Validação de Funcionalidade
- O campo deve ser renderizado com label e placeholder
- A digitação deve atualizar o valor
- O valor deve ser persistido no serviço de formulário

## 5. Considerações Importantes

### 5.1 Integração com Formulários Reativos
O componente deve funcionar com o sistema de formulários reativo do Angular, onde:
- O valor é gerenciado pelo `formControlName`
- Eventos de mudança são tratados corretamente
- Validações são aplicadas conforme configurado

### 5.2 Padronização
- Seguir o mesmo padrão dos componentes existentes (`text-field`, `checkbox-field`, etc.)
- Manter consistência na estrutura de inputs/outputs
- Usar as mesmas convenções de nomenclatura e estilos

## 6. Problemas Comuns e Soluções

### 6.1 Campo Vazio
**Problema**: O valor não aparece no campo
**Solução**: Garantir que o `FormField` tenha uma propriedade `value` ou que o valor seja atualizado corretamente no serviço

### 6.2 Eventos Não Funcionando
**Problema**: Mudanças no campo não são registradas
**Solução**: Verificar se o evento `valueChange` está sendo tratado pelo `FormService`

### 6.3 Estilos Não Aplicados
**Problema**: Componente não aparece com os estilos corretos
**Solução**: Verificar se os arquivos SCSS estão corretamente importados e se as classes CSS são aplicadas

## 7. Próximos Passos

1. Testar o componente no ambiente de desenvolvimento
2. Validar a exportação do formulário com o novo campo
3. Garantir compatibilidade com todas as funcionalidades do sistema
4. Realizar testes de integração com o `FormService`

## 8. Documentação Adicional

### Estrutura de Dados Esperada:
```typescript
interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  icon: string;
  required: boolean;
  inputType?: string;
  options?: RadioOption[];
  // Valor pode ser adicionado conforme necessário
}
```

### Interface FieldTypeDefinition:
```typescript
interface FieldTypeDefinition {
  id: string;
  type: string;
  label: string;  
  icon: string; 
  defaultConfig: any;
  settingsConfig: FieldSettingsDefinition[];
  component: Type<unknown>;
}
```

Este guia fornece todas as instruções necessárias para criar e ativar novos componentes no sistema de form builder, mantendo a consistência com o padrão existente.