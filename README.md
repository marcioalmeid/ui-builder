# UI Builder

Task template builder em **Angular 21**: drag-and-drop de campos, ligação a catálogos/API, regras de visibilidade (workflow), preview com simulação de operador e publicação de templates.

## Quick start

```bash
npm install
npm run dev
```

Abrir [http://localhost:4200/builder](http://localhost:4200/builder)

Para parar mock API + dev server:

```bash
npm run dev:stop
```

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [**docs/PROJECT.md**](docs/PROJECT.md) | Arquitectura, reprodução, stepper, data binding, rules, eventos, erros/acertos, limitações |
| [**docs/TROUBLESHOOTING.md**](docs/TROUBLESHOOTING.md) | Problemas comuns e soluções rápidas |

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

- `/builder` — editor de templates
- `/run/:templateId` — runtime operador
- `/jobs` — submissões (localStorage PoC)

## Stack

Angular 21 · Angular Material · CDK Drag-Drop · Tailwind 4 · TypeScript 5.9 · Vitest

## Documentação Angular CLI

[Angular CLI Overview](https://angular.dev/tools/cli)
