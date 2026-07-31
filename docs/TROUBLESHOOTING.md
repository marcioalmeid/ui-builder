# Troubleshooting — UI Builder

Guia rápido para problemas comuns ao reproduzir ou desenvolver.

---

## A app não arranca

```bash
rm -rf node_modules
npm install
npm run dev
```

Verificar Node 20+. Se porta 4200 ou 3001 ocupada:

```bash
npm run dev:stop
lsof -i :4200 -i :3001   # identificar processos
```

---

## Dropdowns sem opções

1. Confirmar mock API: `curl http://localhost:3001/api/health`
2. Usar `npm run dev` (não só `ng serve`) para ter proxy activo
3. DevTools → Network: pedidos a `/api/task-types` etc. devem retornar 200

---

## Stepper Data não fica verde

Todos os campos **conectáveis** precisam de ligação:

- Text/textarea/date/checkbox → entity map completo (catálogo + campo entidade)
- Dropdown/radio → opções estáticas **ou** catálogo API configurado
- Cost breakdown → catálogo budget line items

Campos `section-header` e `button` não contam.

---

## Stepper Rules não fica verde

Cada regra **enabled** precisa de:

- Trigger com campo válido
- Condição com operador + valor (se aplicável)
- Nós show/hide/event com alvo ou nome preenchido

Abrir aba **Rules** e corrigir avisos; regras disabled não bloqueiam.

---

## Publish desactivado

Causas: campos sem data connection ou regras inválidas. Ver mensagem no diálogo Publish ou passo Data/Rules no stepper.

---

## Simulação esconde campos inesperados

Comportamento normal para campos alvo de **Show** (começam ocultos).

Campos base (ex.: Title, Description, Task type) **não** devem estar em acções show/hide unless configurados.

Se Title aparecer como oculto:

1. Limpar localStorage (`ui-builder-templates-v1`)
2. Reload — seed v7 recria demo
3. Verificar aba Rules: Budget rule deve ter **Show → Budget**, não Title

---

## Template não edita

Se `status === 'published'`, editor fica read-only. **Duplicate** o template para obter draft.

---

## Eventos não aparecem na simulação

1. Regra precisa de nó **Emit event** na cadeia **depois** da condição
2. Condição tem de ser verdadeira com valores actuais
3. Regra tem de estar **enabled**

Demo: Task type = Digital Advertising → `campaign.type.selected`.

---

## Testes falham

```bash
npx vitest run src/app/utils/
```

Testes de componente Angular podem precisar de `ng test` com ambiente completo.

---

## Reset completo (estado zero)

DevTools → Application → Clear site data, ou:

```javascript
// Console do browser
localStorage.clear();
location.reload();
```

---

Ver também [PROJECT.md](./PROJECT.md) para arquitectura e fluxos completos.
