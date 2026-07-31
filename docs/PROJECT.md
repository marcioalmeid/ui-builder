# UI Builder — Documentação do Projeto

Task template builder em **Angular 21** para desenhar formulários operacionais, ligar dados a catálogos/API, definir regras de visibilidade (workflow) e publicar templates para runtime de operadores.

---

## Índice

1. [Reproduzir o projeto](#1-reproduzir-o-projeto)
2. [Rotas e fluxos](#2-rotas-e-fluxos)
3. [Arquitetura](#3-arquitetura)
4. [Stepper de setup](#4-stepper-de-setup)
5. [Tipos de campo e data binding](#5-tipos-de-campo-e-data-binding)
6. [Regras (workflow) e visibilidade](#6-regras-workflow-e-visibilidade)
7. [Emit event](#7-emit-event)
8. [Persistência (localStorage)](#8-persistência-localstorage)
9. [Mock API e catálogo](#9-mock-api-e-catálogo)
10. [Demo template](#10-demo-template)
11. [Testes](#11-testes)
12. [Erros conhecidos e correções](#12-erros-conhecidos-e-correções)
13. [Acertos e decisões de design](#13-acertos-e-decisões-de-design)
14. [Limitações actuais](#14-limitações-actuais)
15. [Referência rápida de ficheiros](#15-referência-rápida-de-ficheiros)

---

## 1. Reproduzir o projeto

### Pré-requisitos

| Ferramenta | Versão usada no projeto |
|------------|-------------------------|
| Node.js    | 20+ recomendado           |
| npm        | 11.x (`packageManager` no `package.json`) |

### Instalação

```bash
cd ui-builder
npm install
```

### Desenvolvimento (recomendado)

Sobe **mock API** (porta 3001) + **Angular dev server** (porta 4200) com proxy `/api` → mock:

```bash
npm run dev
```

Abrir: [http://localhost:4200/builder](http://localhost:4200/builder)

Parar processos:

```bash
npm run dev:stop
```

### Alternativas

```bash
# Só Angular (dropdowns usam fallback estático em public/catalog/*.json se mock não estiver up)
npm start

# Só mock API
npm run mock-api

# Build produção
npm run build

# Testes unitários (Vitest)
npm test
# ou
npx vitest run src/app/utils/
```

### Proxy

`proxy.conf.json` encaminha `/api/*` → `http://localhost:3001`. Configurado em `angular.json` → `serve.options.proxyConfig`.

### Primeira execução

1. Abre `/builder`
2. Aparece diálogo de boas-vindas (guardado em `localStorage`: `ui-builder-welcome-seen`)
3. É injectado o demo **New Task (Advertising)** se ainda não existir seed (`ui-builder-demo-seeded-v7`)
4. Seleciona o template demo na sidebar → segue o stepper

### Limpar estado local (útil para debug)

No DevTools → Application → Local Storage, remover:

| Chave | Conteúdo |
|-------|----------|
| `ui-builder-templates-v1` | Templates, layout, regras |
| `ui-builder-demo-seeded-v7` | Flag de seed do demo |
| `ui-builder-welcome-seen` | Diálogo welcome |
| `job-data-*` | Submissões de jobs |

Ou janela anónima + reload.

---

## 2. Rotas e fluxos

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | redirect | → `/builder` |
| `/builder` | `DragDropEditorComponent` | Editor principal (stepper + sidebar + canvas) |
| `/run/:templateId` | `TaskRuntime` | Formulário para operador (template **published**) |
| `/jobs` | `JobList` | Lista de submissões (PoC localStorage) |

### Fluxo do autor do template

```
Template → Layout → Data → Rules → Preview → Publish
```

### Fluxo do operador

1. Template publicado
2. Copiar link em `/run/:templateId` ou abrir directamente
3. Preencher campos visíveis (regras aplicadas)
4. Submit → grava `JobSubmission` em localStorage

---

## 3. Arquitetura

```
src/app/
├── catalog/              # Demo templates + DATA_CATALOG
├── components/
│   ├── builder-sidebar/  # Template, fields palette, data checklist, rules
│   ├── main-canvas/      # Editor, preview, workflow builder
│   ├── field-settings/   # Painel direito por campo
│   ├── fields-types/     # Um componente por tipo de campo
│   ├── task-runtime/     # Runtime operador
│   └── ...
├── models/               # field, form, workflow-rule, workflow-event, job-submission
├── services/
│   ├── form.services.ts  # Estado central, persistência, undo
│   ├── field-types.service.ts
│   ├── data-catalog.service.ts
│   └── job.service.ts
└── utils/                # Validação, visibilidade, payload API, readiness
mock-api/server.mjs       # REST mock
public/catalog/*.json     # Fallback estático + fonte do mock
```

### Estado central: `FormService`

- Templates activos, rows, data bindings, workflow rules
- Selecção de campo / regra
- `previewJobData` para simulação no builder
- Undo/redo, publish, duplicate
- Persistência em `localStorage`

### Renderização dinâmica de campos

`FieldTypeService` regista cada tipo → componente Angular.  
`FieldPreview` usa `NgComponentOutlet` para renderizar o componente correcto no canvas/preview.

---

## 4. Stepper de setup

Definido em `src/app/utils/template-readiness.ts`.

| Passo | Fica verde quando… |
|-------|---------------------|
| **Template** | Template seleccionado com nome |
| **Layout** | Existe pelo menos 1 campo no canvas |
| **Data** | Todos os campos **conectáveis** têm ligação de dados |
| **Rules** | Data completo **e** todas as regras enabled são válidas |
| **Preview** | Preview visitado **e** rules válidas |
| **Publish** | Template com `status: 'published'` |

**Cascata:** passos posteriores só ficam verdes se os anteriores estiverem completos (excepto Publish que depende do status).

**Publish bloqueado** se faltar ligação de dados ou regra inválida (`validateTemplateForPublish`).

---

## 5. Tipos de campo e data binding

Registados em `src/app/services/field-types.service.ts`.

| Tipo | Paleta | Modo data (`field-data-binding.ts`) | Recolhe valor no job |
|------|--------|-------------------------------------|----------------------|
| `text` | Sim | `entity-map` | Sim |
| `textarea` | Sim | `entity-map` | Sim |
| `datepicker` | Sim | `entity-map` | Sim |
| `checkbox` | Sim | `entity-map` | Sim |
| `dropdown` | Sim | `options` | Sim |
| `radio` | Sim | `options` | Sim |
| `cost-breakdown` | Sim | `line-items` | Sim |
| `section-header` | Sim | `label` (sem ligação) | Não |
| `button` | Sim | `label` (sem ligação) | Não |

### Modos de ligação

- **entity-map** — campo mapeado a propriedade de entidade do catálogo (`entity-field-mapper`)
- **options** — dropdown/radio com opções estáticas ou catálogo API
- **line-items** — cost breakdown + catálogo budget line items
- **label** — só layout (section header, button); não conta para passo Data

### Adicionar novo tipo de campo

1. Criar componente em `fields-types/`
2. Registar em `field-types.service.ts` (`FieldTypeDefinition`)
3. Actualizar `getDataBindingMode()` em `field-data-binding.ts`
4. Actualizar exclusões em `job-validation.ts`, `field-visibility.ts`, `workflow-builder` (triggers), etc.

---

## 6. Regras (workflow) e visibilidade

**Única fonte de verdade:** `template.layout.workflowRules` (aba **Rules**).

Modelo: `src/app/models/workflow-rule.ts`  
Avaliação: `src/app/utils/workflow-evaluation.ts`  
UI visibilidade: `src/app/utils/field-visibility.ts`

### Tipos de nó

| Nó | Função |
|----|--------|
| `trigger` | Campo que dispara a regra |
| `condition` | If (equals, notEmpty, contains, …) |
| `action-show` | Mostra campo alvo quando condição passa |
| `action-hide` | Esconde campo alvo quando condição passa |
| `action-event` | Emite evento nomeado (ver secção 7) |

### Semântica de visibilidade (importante)

| Acção | Comportamento por defeito |
|-------|---------------------------|
| **Show** | Campo alvo **oculto** até a condição ser verdadeira |
| **Hide** | Campo alvo **visível** até a condição ser verdadeira e o hide correr |
| **Sem regra** | Campo sempre visível |

Campos que **não são alvo** de show/hide ignoram regras e ficam sempre visíveis.

### Preview vs simulação

| Modo | Comportamento |
|------|---------------|
| Preview (sem checkbox) | Mostra **todos** os campos |
| **Simulate operator** | Aplica visibilidade + painel de campos ocultos + eventos activos |

### Migração legacy

`migrateLegacyVisibilityRules()` em `workflow-migration.ts` converte antigo `field.visibilityRule` em regras workflow ao carregar template. Campos per-field **Advanced visibility** foram removidos da UI.

---

## 7. Emit event

Modelo runtime: `src/app/models/workflow-event.ts`

Quando a cadeia trigger → condition passa, nós `action-event` produzem `WorkflowEmittedEvent` com contexto automático:

- `eventName`, `ruleId`, `ruleName`
- `templateId`, `templateVersion`
- `trigger` (fieldId, label, value)
- `condition` (operator, value)
- `payload` (vazio na fase 1; reservado para fase 2)
- `timestamp`

**Onde aparece:**

- Aba Rules → "Live events"
- Preview com Simulate operator → painel roxo
- JSON Data → array `events` no payload
- Submit job → `JobSubmission.events`

**Ainda não implementado:** dispatch para backend, webhooks, acções ao clicar botões.

---

## 8. Persistência (localStorage)

| Chave | Serviço | Conteúdo |
|-------|---------|----------|
| `ui-builder-templates-v1` | `FormService` | `{ templates, activeTemplateId, timestamp }` |
| `form-builder-state` | legacy | Migrado automaticamente na 1.ª carga |
| `ui-builder-demo-seeded-v7` | seed demo | `'1'` se demo já injectado |
| `job-data-{id}` | `JobRepository` | `JobSubmission` individual |

Templates **published** são read-only no editor (duplicate para editar).

---

## 9. Mock API e catálogo

### Endpoints (`mock-api/server.mjs`)

| Rota | Ficheiro |
|------|----------|
| `GET /api/health` | health check |
| `GET /api/users` | `public/catalog/users.json` |
| `GET /api/task-types` | `task-types.json` |
| `GET /api/platforms` | `platforms.json` |
| `GET /api/request-types` | `request-types.json` |
| `GET /api/vendors` | `vendors.json` |
| `GET /api/budget-line-items` | `budget-line-items.json` |

Porta: `MOCK_API_PORT` (default **3001**).

### Catálogo em código

`src/app/catalog/data-catalog.items.ts` — metadados, URLs, `entityFields` por item.

---

## 10. Demo template

`createNewTaskDemoTemplate()` em `src/app/catalog/demo-templates.ts`

**Nome:** New Task (Advertising)  
**Context:** advertising  
**Status inicial:** draft

### Campos

Title, Description, Task type, Due date, Assign to, secção Digital Advertising, Platform, Request type, Vendor, Budget, Cost breakdown.

### Regras pré-configuradas

1. **Show advertising section** — Task type = `digital-advertising` → mostra secção + Platform + Request type + Vendor + Cost breakdown → emite `campaign.type.selected`
2. **Show Budget** — Request type = `budget-change` → mostra Budget → emite `budget.change.requested`

### Testar simulação completa

1. Preview → Simulate operator
2. Task type → Digital Advertising
3. Request type → Budget change
4. Ver campos condicionais + 2 eventos activos

---

## 11. Testes

Vitest (via `ng test` ou `npx vitest run`).

Testes de utilitários (mais estáveis):

```bash
npx vitest run src/app/utils/field-visibility.spec.ts
npx vitest run src/app/utils/workflow-evaluation.spec.ts
```

Cobrem: visibilidade do demo, semântica show/hide, eventos emitidos.

---

## 12. Erros conhecidos e correções

### Title oculto pela regra de Budget no primeiro load

**Sintoma:** Painel "campos ocultos" mostrava `Title — Hidden by rule "Show Budget…"` sem o operador ter alterado nada.

**Causas identificadas:**

1. Hide targets eram tratados como ocultos **por defeito** (igual a show targets)
2. Mensagem "Hidden by rule" aparecia mesmo quando a condição **não tinha disparado**
3. Dados corruptos em localStorage (regras antigas / migração)

**Correcção:** `workflow-evaluation.ts` + `field-visibility.ts` — hide só oculta após acção; hint só quando hide correu. Seed demo bump (v5→v6→v7).

**Se persistir:** limpar `ui-builder-templates-v1` ou usar janela anónima.

---

### Entity mapping não reflectia no canvas/checklist

**Sintoma:** Mapeamento feito no painel Data não persistia ou não actualizava UI.

**Correcção:** `selectionChange` no `mat-select` do entity mapper + `mergeFieldUpdate()` em `field-data-source.ts`.

---

### Checklist Data não abria painel correcto

**Sintoma:** Clicar item na checklist só seleccionava campo; painel direito continuava em Field properties.

**Correcção:** Click na checklist activa passo **Data** + selecciona campo + scroll no canvas.

---

### Confusão: 1 regra vs muitos campos ocultos

**Sintoma:** Utilizador via 1 regra em Rules mas muitos campos escondidos na simulação.

**Explicação:** Antes existiam **duas** fontes (`field.visibilityRule` + workflow). Agora só workflow. Demo tem **2 regras** (advertising + budget), cada uma com vários alvos show.

---

### Dropdowns vazios sem mock API

**Sintoma:** Catálogos API não carregam.

**Solução:** Correr `npm run dev` (mock + proxy). Sem mock, alguns campos usam `options` estáticas definidas em `demo-templates.ts` / field defaults.

---

### Template published não edita mappings

**Comportamento intencional:** Published = read-only. Usar **Duplicate** para criar draft editável.

---

### Emit event "não faz nada"

**Comportamento actual (fase 1):** Calcula e mostra eventos; não há listener externo nem efeitos no runtime excepto gravação no submit/JSON.

---

## 13. Acertos e decisões de design

| Decisão | Porquê funcionou |
|---------|------------------|
| **Stepper com gates reais** | Publish só quando data + rules válidos — evita templates incompletos |
| **Visibilidade centralizada em Rules** | Uma mental model; migração automática de legacy |
| **Show vs Hide semântica distinta** | Show = opt-in; Hide = opt-out — evita esconder campos base por engano |
| **Modos de data binding por tipo** | Checklist Data clara: entity-map vs catalog vs label |
| **Mock API + proxy + JSON fallback** | Reproduzível offline; dev sem backend real |
| **WorkflowEmittedEvent com contexto auto** | Backend futuro recebe trigger/value sem config manual |
| **FieldTypeService + NgComponentOutlet** | Novos tipos de campo sem alterar canvas |
| **localStorage PoC** | Iteração rápida; contrato JSON Data preparado para API real |
| **Demo template com 2 regras encadeadas** | Testa simulação realista (task type → secção → request type → budget) |

---

## 14. Limitações actuais

- Persistência só em **localStorage** (sem API de templates/jobs)
- **Published** templates não editáveis in-place
- **Emit event** sem consumidor backend / sem acção em botões
- **Button** é visual; click não dispara submit ou eventos
- **Fase 2 eventos:** `eventPayload` estático e `includeFieldIds` por configurar na UI
- Geração de código Angular (`FormService.generateForm()`) é export auxiliar, não runtime principal
- Testes e2e não configurados
- Undo limitado ao que `FormService` regista

---

## 15. Referência rápida de ficheiros

| Área | Ficheiros principais |
|------|---------------------|
| Stepper | `template-setup-stepper/*`, `template-readiness.ts` |
| Layout / drag-drop | `form-editor/*`, `form-field/*`, `form-elements-menu/*` |
| Data step | `data-checklist/*`, `field-data-panel/*`, `entity-field-mapper/*`, `data-source-editor/*` |
| Rules | `workflow-builder/*`, `workflow-rules-panel/*`, `workflow-evaluation.ts`, `workflow-readiness.ts` |
| Preview | `form-preview/*`, `field-visibility.ts` |
| Publish | `publish-confirm-dialog/*`, `publish-summary.ts`, `validateTemplateForPublish` |
| Runtime | `task-runtime/*`, `job.service.ts`, `job.repository.ts` |
| API payload | `api-payload.ts`, `dev-payload-panel/*` |
| Demo | `catalog/demo-templates.ts`, `catalog/data-catalog.items.ts` |

---

## Diagrama: avaliação de regras na simulação

```mermaid
flowchart TD
  A[jobData / previewJobData] --> B[evaluateWorkflowRules]
  B --> C[shownFieldIds]
  B --> D[hiddenFieldIds]
  B --> E[WorkflowEmittedEvent[]]
  C --> F[isFieldVisible]
  D --> F
  F --> G[FormPreview renderiza campos]
  D --> H[Painel campos ocultos]
  E --> I[Painel eventos activos]
  E --> J[JSON submit / JobSubmission]
```

---

*Última actualização: reflecte estado do repo com stepper 6 passos, workflow centralizado, eventos fase 1, button na paleta, demo seed v7.*
