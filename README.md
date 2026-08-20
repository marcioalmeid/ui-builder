# UI Builder

Task template builder em **Angular 21**: drag-and-drop de campos, ligação a catálogos/API, regras de visibilidade (workflow), preview com simulação de operador e publicação de templates.

## Quick start

```bash
npm install
npm run dev
```

Abrir [http://localhost:4200/tasks](http://localhost:4200/tasks)

Para parar mock API + dev server:

```bash
npm run dev:stop
```

## Documentação

Pasta no vault: [**Notas/Geradas por IA**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/)

| Documento | Conteúdo |
|-----------|----------|
| [**VALIDAR-SPIKE.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/VALIDAR-SPIKE.md) | Como validar a retroatividade no ecrã (sem arquitectura) |
| [**SPIKE-SEEDS.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/SPIKE-SEEDS.md) | Esquema visual dos seeds `[S0]`–`[S8]` |
| [**PROJECT.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/PROJECT.md) | Arquitectura, reprodução, stepper, data binding, rules, eventos, erros/acertos, limitações |
| [**TROUBLESHOOTING.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/TROUBLESHOOTING.md) | Problemas comuns e soluções rápidas |
| [**Comparativo arquitectura vs PoC**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/comparativo-arquitectura-vs-poc-ui-builder.md) | Fundamentos ADR-014 vs diagramas vs o que o PoC prova |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Mock API (:3001) + `ng serve` (:4200) com proxy `/api` |
| `npm run dev:stop` | Para processos dev |
| `npm start` | Só Angular (sem mock) |
| `npm run mock-api` | Só mock API |
| `npm run build` | Build produção |
| `npm test` | Testes unitários (Vitest) |

## Rotas

- `/tasks` — hub do operador (listar / clonar tasks)
- `/tasks/new` — catálogo de templates publicados para criar task
- `/tasks/:taskId` — detalhe da task (editar valores; atualização de formulário avançada)
- `/templates` — biblioteca de templates (autor)
- `/builder/:templateId` — studio de edição
- `/run/:templateId` — runtime operador (usa o último snapshot publicado, não o draft)
- `/jobs` e `/jobs/:id` — aliases legados → `/tasks`

## Spike de retroatividade (ADR-014)

Guia para validar no ecrã: [**VALIDAR-SPIKE.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/VALIDAR-SPIKE.md). Esquema visual dos seeds: [**SPIKE-SEEDS.md**](file:///Users/mmendes/Documents/new-job-q-vault/Notas/Geradas%20por%20IA/SPIKE-SEEDS.md).

Dois canais, um pin. Layout (campos) aplica-se sem andar o pin; comportamento (`workflowRules`) só anda com **Migrate +1**. Unpublish edita a mesma família (`template.id`). **Não uses Clone** no demo — um id novo parte o pin.

Roteiro:

1. Publish v1 do demo **New Task (Advertising)**.
2. `/run/:id` → submeter um job (pin 1).
3. Unpublish → mudar o **label do Title** (não é trigger) **e** apertar uma regra (esconder Vendor) → Publish.
4. Dry-run: cosmética auto · rules Breaking · pin não anda. Cancelar uma vez (zero writes); depois Confirmar.
5. `/jobs/:id`: Title novo, regras v1 (Vendor visível), pin 1. **T18**
6. Unpublish → acrescentar só uma regra show inócua (SAFE) → Publish. O job continua pin 1 (barreira: v2 Breaking não foi aplicado). **Migrate → pin 2, regras de v2** (hide Vendor). Segundo Migrate → pin 3 SAFE. Nunca salta v2.
7. No diálogo, policy **6a** → mudar um hint → Confirmar. O job **não** vê o hint até Migrate (evento existe, apply não corre).
8. Policy **6b** → campo opcional novo → o job antigo mostra o campo vazio (aditiva, pin intocado).
9. Mudar o label de **Task type** (trigger de regra) → dry-run manda para Comportamento, não auto-aplica.

Há seeds prontos em **Templates → Spike tools**. Carrega **um** cenário de cada vez (substitui o template de Digital Advertising — um ativo por departamento). Abre o studio e **Reopen seed task** no guia do cenário.

| Seed | Estado | O que verificar |
|------|--------|-----------------|
| S0 | Draft publicável | Publish v1 |
| S1 | v1 + job pin 1 | Runtime / pin |
| S2 | T18 aplicado | Title novo, pin 1, Vendor visível |
| S3 | v3 SAFE, job pin 1 | Migrate → pin 2, não 3 |
| S4 | 1º Migrate feito | pin 2, Vendor escondido |
| S5 | 2º Migrate feito | pin 3, regra Print presente |
| S6 | 6a hint pendente | Hint novo não aparece até Migrate |
| S7 | 6b campo aditivo | Internal notes no job antigo, pin 1 |
| S8 | Trigger label | Job ainda diz Task type, pin 1 |

PASS se 1–9 forem reproduzíveis. FAIL se o label novo exigir Migrate, se regras novas se aplicarem sem Migrate, se v3 SAFE puxar um job ainda bloqueado em v2, se 6a auto-aplicar layout, ou se um campo-trigger auto-aplicar como cosmética.

Testes do motor:

```bash
npx vitest run src/app/utils/retroactivity.spec.ts
```

## Stack

Angular 21 · Angular Material · CDK Drag-Drop · Tailwind 4 · TypeScript 5.9 · Vitest

## Documentação Angular CLI

[Angular CLI Overview](https://angular.dev/tools/cli)
