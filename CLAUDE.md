# CLAUDE.md — Banco de Horas (Web)

Webapp controle banco de horas. Marca: **Cajuína São Geraldo**. Vite/React + Neon (Postgres serverless). Migrado de Expo/RN → Vite/React em 2026-05-06; SQLite WASM removido em 2026-05-06 em favor do Neon.

## Stack atual (web-only)

- **Vite 5** + **React 19** + **TypeScript estrito**
- **Tailwind v4** (`@tailwindcss/vite`) com theme Cajuína em CSS vars (`src/index.css`)
- **React Router v6** (`BrowserRouter`)
- **Neon Postgres** via `@neondatabase/serverless` HTTP driver (`src/database/db.ts` + `dbPg.ts`). URL em `VITE_DATABASE_URL` (.env). Cache de leitura em localStorage (`bdh_cache_v1:*`) — serve dados antigos quando offline.
- **localStorage** sessão (substitui expo-secure-store)
- **framer-motion** (substitui reanimated FadeInDown)
- **lucide-react** ícones
- **date-fns** pt-BR

Path alias: `@/*` → `src/*` (vite.config.ts + tsconfig.json).

## Comandos

```bash
npm install
npm run dev        # vite, http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve dist/
npm run lint       # tsc --noEmit (rodar antes de finalizar task)
```

## Estado da migração (handoff)

### ✅ Pronto

- Foundation Vite: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/index.css`, `public/favicon.svg`
- DB layer reescrito: `src/database/db.ts` usa **sql.js + IndexedDB**. `DbWrapper` expõe `runAsync / getFirstAsync / getAllAsync / execAsync` com mesma assinatura que `expo-sqlite` → **repos compilam sem mudança**
- Auth: `src/contexts/AuthContext.tsx` — `expo-secure-store` substituído por shim localStorage inline
- Theme: `src/theme/typography.ts` limpo (removido `react-native`)
- Componentes web: `Card, Header, Button, Input, BalancePill, SectionLabel, Logo, AnimatedNumber, Wave, DonutChart, BarChart` — todos Tailwind + framer-motion
- Navegação: `src/navigation/TabsLayout.tsx` (bottom tabs Início/Registros/Relatórios/Mais + FAB Registrar central)
- Router root: `src/App.tsx`
- Screens portadas: `SplashScreen, LoginScreen, RegisterScreen, DashboardScreen`
- Arquivos RN deletados: `App.tsx` antigo, `index.js`, `babel.config.js`, todos `src/screens/*`, `src/components/*`, `src/navigation/*` antigos

### ⏳ Pendente — fazer próxima sessão

**Crítico antes de rodar:**
1. `npm install` (deps web ainda não instaladas — node_modules atual é Expo/RN, descartar)
2. `rm -rf node_modules package-lock.json && npm install`
3. Apagar pasta `android/` e `ios/` se ainda existirem (foram criadas em prebuild acidental)
4. Apagar `app.json`, `eas.json` (config Expo, não usar mais)
5. `npm run dev` e debugar erros runtime

**Telas faltando portar** (rotas já registradas em `src/App.tsx`):
- `src/screens/RecordsScreen.tsx` — lista pontos do mês, agrupados por dia, BalancePill por dia
- `src/screens/PunchScreen.tsx` — registrar IN/LUNCH_OUT/LUNCH_IN/OUT (usar `validateNextPunch`)
- `src/screens/ReportsScreen.tsx` — BarChart semanal/mensal, totais
- `src/screens/MoreScreen.tsx` — menu pra Turno, Saldo, Notificações, Perfil, Logout
- `src/screens/ShiftConfigScreen.tsx` — editar shift (entry/lunch/exit times, daily_minutes, active_days)
- `src/screens/BalanceScreen.tsx` — detalhamento saldo (positivo, negativo, usado, agendado)
- `src/screens/OvertimeUsageScreen.tsx` — registrar uso de banco (status `USED`)
- `src/screens/ScheduleOvertimeScreen.tsx` — agendar uso futuro (status `SCHEDULED`)
- `src/screens/MyUsagesScreen.tsx` — listar `overtime_usage`, cancelar
- `src/screens/NotificationsScreen.tsx` — listar notifs, marcar lidas
- `src/screens/ProfileScreen.tsx` — editar user, contract_type, apprentice flag, logout

Pattern para cada tela: `Header` + `Card[]` com `delay` escalonado. Reaproveitar repos existentes (`@/database/repositories/*`) — eles funcionam intactos com novo DB layer.

**Cleanup final:**
6. Remover `app.json`, `eas.json`, pasta `assets/` se não for usar (favicon já em `public/`)
7. Verificar `expo-doctor` não roda mais (sem expo). `npm run lint` deve passar 0 erros.
8. Considerar PWA: adicionar `vite-plugin-pwa` para instalável + offline cache.

## Domínio (inalterado)

### Tipos contrato (`ContractType`)
- `FULL_TIME` — Integral, 8h/dia, almoço obrigatório, OT permitido, máx 10h
- `PART_TIME` — Meio período, 4h/dia, sem almoço, OT permitido, máx 6h
- `APPRENTICE` — Jovem aprendiz, 6h/dia, sem almoço, OT só se `apprentice_overtime_allowed=1`, máx 6h

Regras em `src/services/contract.ts` → `rulesFor(type)`.

### Punches (`PunchType`)
Ordem obrigatória: `IN` → `LUNCH_OUT` → `LUNCH_IN` → `OUT`. Validação em `validateNextPunch()` (`src/services/calc.ts`).

### Cálculo banco horas
- Worked = `(LUNCH_OUT - IN) + (OUT - LUNCH_IN)` ou `OUT - IN` se sem almoço
- Balance = `worked - expected` somente quando dia fechado (`OUT` registrado)
- `expectedMinutesForDate(shift, date)` zero se dia da semana não está em `shift.active_days`

### Tabelas Postgres (Neon)
`users`, `shifts`, `punch_records` (idx `user_id, date`), `work_days` (UNIQUE `user_id, date`), `overtime_usage` (status: USED/SCHEDULED/CANCELED), `notifications`, `settings`, `audit_logs`. FKs `ON DELETE CASCADE`.

Schema em `src/database/schemaPg.ts` — array de `CREATE TABLE IF NOT EXISTS` aplicados em `connectPg`. Repos usam placeholders `?` — `PgDbWrapper` traduz pra `$1, $2, ...` e adiciona `RETURNING id` em INSERTs sem RETURNING explícito. Aggregates (`COUNT`, `SUM`) chegam como string — sempre cast com `Number()`.

## Tema (Cajuína São Geraldo)

CSS vars em `src/index.css` `@theme {}`:
```
primary       #008943
primary-dark  #006B34
accent        #F15A29
yellow        #F9C23C
brown         #5B3A17
cream         #FFF7E6
bg            #FFFBF2
```

Use classes Tailwind: `bg-primary`, `text-cream`, `border-border`, etc.

## Padrões UI (seguir sempre)

- Tela nova = `<Header />` + `<Card delay={n} />` empilhados (max-w xl, mx-auto)
- Leitura dados: `useEffect` + repositório (`src/database/repositories/*`). Não chamar SQL direto.
- Após escrita que afeta saldo/horas: chamar `useSettings().bumpVersion()` para invalidar leituras nas telas focadas (efeito tipo `useFocusEffect`).
- Português pt-BR todo texto user-facing.
- Animações: `Card` já tem fade+slide via framer-motion, escalonar com `delay={0.05 * i}`.

## Auth / sessão

- Login via `AuthContext` (`useAuth()`). Sessão persistida em `localStorage['bdh_user_id']`.
- Splash até `ready === true`, depois Login ou rotas protegidas (`<Protected>`).
- Sem seed: registre via `/register` na primeira execução (Neon começa vazio).

## Navegação

`react-router-dom` v6, rotas em `src/App.tsx`:
- Públicas: `/login`, `/register`
- Protegidas via `<Protected>`:
  - Tabs (`TabsLayout` outlet): `/`, `/registros`, `/registrar`, `/relatorios`, `/mais`
  - Standalone: `/turno`, `/saldo`, `/usar-banco`, `/agendar`, `/meus-usos`, `/notificacoes`, `/perfil`

Bottom tabs renderiza FAB central pra `/registrar`.

## Regras claras

1. **Online required** para writes (Neon HTTP). Reads servem cache stale em offline.
2. **Nunca** mexer cores marca / paleta sem pedir.
3. **Sempre** typecheck (`npm run lint`) antes de declarar feito.
4. **Sempre** usar `@/` em imports internos.
5. **Sempre** acessar DB via repos em `src/database/repositories/`. Novo repo se falta.
6. **Sempre** chamar `bumpVersion()` após escrita que afeta saldo.
7. **Sempre** validar punch via `validateNextPunch` antes de inserir.
8. **Não** adicionar comentário óbvio. Só comentar invariante não-óbvia.
9. **Não** criar arquivo `.md` novo sem pedido explícito.
10. Apprentice OT: respeitar flag `apprentice_overtime_allowed`. Bloquear UI se zero.
11. Texto user-facing **pt-BR**.
12. Datas formato `yyyy-MM-dd`, horas `HH:mm`. Helpers em `src/utils/date.ts`.
13. **Nunca** importar de `react-native`, `expo*`, `@react-navigation/*` — webapp puro.

## Schema migrations

Schema atual `CREATE TABLE IF NOT EXISTS` apenas em `schemaPg.ts`. Mudança de coluna exige `ALTER TABLE` adicionado ao array. Não dropar tabela com dados. `resetDatabase()` em `db.ts` faz drop + recreate (uso em dev/testes apenas).

## Quando em dúvida

- Tela nova → copiar pattern de `DashboardScreen.tsx` ou `LoginScreen.tsx`
- Cálculo horas → estender `src/services/calc.ts`, não inline em tela
- Regra contrato → `src/services/contract.ts`
- Cor/spacing → classes Tailwind do theme, nunca hardcode hex
