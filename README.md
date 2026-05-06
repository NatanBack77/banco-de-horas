# Banco de Horas — Cajuína São Geraldo

App mobile (iOS + Android) para controle de banco de horas, com SQLite local, suporte a contratos integral / meio período / jovem aprendiz, agendamento e uso de horas extras, relatórios visuais e tema inspirado na Cajuína São Geraldo.

> **Status:** projeto Expo + TypeScript funcional, pronto para `npm install && npx expo start`.

---

## 1. Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Expo SDK 51 (iOS + Android + Web) |
| Linguagem | TypeScript estrito |
| Storage local | `expo-sqlite` (offline-first) |
| Navegação | `@react-navigation/native-stack` + bottom tabs |
| Animação | `react-native-reanimated` |
| Gráficos | `react-native-svg` (Donut + Bar customizados) |
| Datas | `date-fns` (locale pt-BR) |
| Sessão | `expo-secure-store` |

Sem dependência de servidor. **100% offline.**

---

## 2. Como rodar

```bash
cd banco_de_horas
npm install        # ou yarn / pnpm install
npx expo start     # abre Metro bundler
# 'i' → iOS · 'a' → Android · 'w' → web preview
```

Para builds nativos:
```bash
npx expo run:ios
npx expo run:android
# ou EAS Build → eas build --platform all
```

**Usuário de teste pré-semeado:**
- e-mail: `joao@saogeraldo.com`
- senha: `123456`
- contrato: integral, turno 08:00–17:00, 10 dias úteis com pontos de exemplo.

---

## 3. Arquitetura

```
src/
├─ theme/              cores (verde #008943, laranja #F15A29, amarelo #F9C23C,
│                      marrom #5B3A17, creme #FFF7E6) + tipografia + spacing
├─ types/              tipos TS (User, Shift, PunchRecord, OvertimeUsage, ...)
├─ database/
│  ├─ db.ts            singleton SQLite + initDatabase / resetDatabase
│  ├─ schema.ts        DDL completo (users, shifts, punch_records, work_days,
│  │                   overtime_usage, notifications, settings, audit_logs)
│  ├─ seed.ts          dados de exemplo (usuário + 10 dias de pontos)
│  └─ repositories/    CRUD por entidade
│     ├─ userRepo, shiftRepo, punchRepo, overtimeRepo,
│        workDayRepo, notificationRepo
├─ services/
│  ├─ auth.ts          hash de senha local (offline)
│  ├─ contract.ts      regras por tipo (FULL_TIME / PART_TIME / APPRENTICE)
│  ├─ calc.ts          cálculo de horas trabalhadas, esperadas, saldo,
│  │                   validateNextPunch (impede fluxos inválidos)
│  └─ validation.ts    e-mail, senha, HH:mm, datas
├─ utils/date.ts       hmToMinutes, minutesToHm, signedHm, ym, today, nowHm
├─ components/         Card · Button · Input · AnimatedNumber · DonutChart ·
│                      BarChart · Header · BalancePill · Logo (SVG) · SectionLabel
├─ contexts/
│  ├─ AuthContext      login / register / logout / sessão persistida
│  └─ SettingsContext  turno padrão + bumpVersion para invalidar caches
├─ navigation/
│  ├─ RootNavigator    Splash → Login/Register ou Tabs + telas modais
│  └─ TabNavigator     Início · Registros · [Registrar] · Relatórios · Mais
└─ screens/            14 telas (ver § 4)
```

### Fluxo de cálculo (resumo)

1. Usuário registra `IN`, `LUNCH_OUT`, `LUNCH_IN`, `OUT` em `punch_records`.
2. `validateNextPunch` impede sequência inválida (não permite `LUNCH_IN` sem `LUNCH_OUT`, etc.).
3. `computeWorkDayFromPunches` recalcula `worked_minutes` (manhã + tarde) e grava em `work_days` com `expected_minutes` baseado no `Shift` ativo daquele dia da semana.
4. `balance_minutes = worked - expected` (apenas dias fechados com `OUT`).
5. Saldo total = `SUM(work_days.balance_minutes)` − `SUM(overtime_usage USED)` − `SUM(overtime_usage SCHEDULED)`.
6. `Shift.active_days` (JSON `[1..5]`) define dias úteis; alterações no turno afetam apenas dias futuros (recálculo automático ao salvar via `bumpVersion`).

### Regras por contrato (`services/contract.ts`)

| Contrato | Carga padrão | Almoço | Hora extra | Limite diário |
|----------|--------------|--------|-----------|---------------|
| FULL_TIME | 8h | obrigatório | sim | 10h |
| PART_TIME | 4h | opcional | sim | 6h |
| APPRENTICE | 6h | opcional | só com flag `apprentice_overtime_allowed` | 6h (alerta) |

A UI adapta chips de tipo no Perfil; jovem aprendiz exibe um Switch para liberar HE.

---

## 4. Telas

| # | Rota | Descrição |
|---|------|-----------|
| 1 | `Splash` | Logo SVG com fade + scale, branding São Geraldo |
| 2 | `Login` | E-mail/senha + atalhos para criar conta / recuperar |
| 3 | `Register` | Nome, e-mail, senha + chips para tipo de contrato |
| 4 | `Tabs/Home` (Dashboard) | Saldo animado, status do dia, gráfico de barras do mês, atalhos |
| 5 | `Tabs/Punch` | Cards de tipo de registro, validação de sequência, histórico do dia, toast de confirmação |
| 6 | `Tabs/Records` | Lista por mês, navegação ←/→, destaque positivo/negativo |
| 7 | `ShiftConfig` | Turno padrão configurável, dias da semana (toggle) |
| 8 | `Balance` | Donut animado positivo/negativo + cards de detalhamento |
| 9 | `OvertimeUsage` | Saldo disponível + form de utilização imediata, validação contra saldo |
| 10 | `ScheduleOvertime` | Mesma estrutura, status `SCHEDULED` |
| 11 | `MyUsages` | Tabs Resumo/Detalhado, lista de utilizações, cancelar agendamento |
| 12 | `Tabs/Reports` | Resumo/Detalhado, gráfico de barras, métricas, dias com atraso |
| 13 | `Notifications` | Lista cronológica, ícones por tipo, marca como lidas ao abrir |
| 14 | `Profile` | Avatar inicial, troca de tipo de contrato, atalhos para configurações, logout |

---

## 5. Identidade visual

Paleta extraída da identidade Cajuína São Geraldo:

| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#008943` | CTA, saldo positivo, headers |
| `accent` | `#F15A29` | Saldo negativo, atenção |
| `yellow` | `#F9C23C` | Apoio, destaques quentes |
| `brown` | `#5B3A17` | Tipografia secundária, ícones de detalhe |
| `cream` | `#FFF7E6` | Cards destacados, fundo splash |
| `bg` | `#FFFBF2` | Fundo geral |

- Cards: `radius 16`, sombra suave (`brown @ 6%`), borda `#EFE7D2`.
- Botões `50px` altura, microinteração de `scale` no press (Reanimated spring).
- Tipografia: Poppins (regular/medium/semibold/bold) — fallback para system.
- Tab bar com FAB central para `Registrar` (verde, sombra colorida).

---

## 6. Animações principais

- **Splash:** logo fade-in + leve overshoot na escala, texto com delay.
- **Login/Register:** campos com `FadeInDown` em cascata.
- **Dashboard:** cards `FadeInDown` em sequência; saldo principal `<AnimatedNumber>` com Reanimated `withTiming` + `Easing.out.cubic`.
- **Botões:** `useSharedValue` de scale → `withSpring(0.97)` no press.
- **Punch:** confirmação `ZoomIn` em toast verde, haptic `Medium` no salvar.
- **Records / Reports:** `FadeInDown` por linha + `Layout.springify()` para animação de reordenação ao trocar mês.
- **Donut:** stroke pintado proporcional (cresce conforme dados ao re-renderizar).

---

## 7. Validações

- E-mail RFC simples, senha ≥ 6, confirmação igual.
- HH:mm via regex `([01]\d|2[0-3]):[0-5]\d`.
- `validateNextPunch` no fluxo de ponto (não permite retorno sem saída, etc.).
- Uso de HE com saldo insuficiente exibe Alert com confirmação manual.
- Apprentice + flag desligada bloqueia uso de HE.

---

## 8. SQLite — tabelas principais

| Tabela | Função |
|--------|--------|
| `users` | login, contrato, flag aprendiz HE, meta mensal |
| `shifts` | turnos (entrada, saídas, almoço, dias ativos JSON) |
| `punch_records` | pontos individuais com `deleted` (soft delete) |
| `work_days` | snapshot por dia (esperado / trabalhado / saldo / fechado) |
| `overtime_usage` | uso e agendamento de HE (`USED` / `SCHEDULED` / `CANCELED`) |
| `notifications` | lista local de eventos |
| `settings` | preferências (notificações, hápticos, meta semanal) |
| `audit_logs` | rastreabilidade (entidade, antes/depois em JSON) |

Índice em `(user_id, date)` em `punch_records` para listas mensais rápidas.

---

## 9. Como testar os fluxos

1. **Login** com `joao@saogeraldo.com` / `123456` (já semeado).
2. **Dashboard:** ver saldo animado e gráfico do mês com 10 dias semeados.
3. **Punch:** tocar `Registrar` → testar `IN` antes de `LUNCH_OUT` (deve bloquear se em ordem inválida). Após `OUT`, o saldo do dia é gravado em `work_days`.
4. **Records:** trocar mês com setas, ver dias semeados.
5. **ShiftConfig:** alterar carga diária para `06:00`, salvar, voltar ao Dashboard — saldo recalcula em novos pontos.
6. **OvertimeUsage:** registrar `01:00` com motivo "Consulta médica" → vai para `MyUsages`.
7. **ScheduleOvertime:** agendar `02:00` para data futura, depois cancelar em `MyUsages` → status `CANCELED`.
8. **Profile:** alternar para `Jovem aprendiz` — switch HE aparece. Tentar usar HE com flag off → bloqueado por Alert.
9. **Reports:** alternar `Resumo` / `Detalhado`, ver lista por dia + alerta de dias negativos.

---

## 10. Decisões de arquitetura

- **Repositórios** finos com SQLite assíncrono (`getAllAsync`, `runAsync`) — fácil de mockar no futuro.
- **Contextos** apenas para auth e turno; estado por tela é local + reload em `useFocusEffect` (sem cache global agressivo).
- **`bumpVersion`** simples no `SettingsContext` substitui um sistema de cache: cada tela chama `useFocusEffect` lendo do banco, e mudanças (ponto novo, agendamento, etc.) bumpam a versão para invalidar.
- **Cálculo no cliente** (`computeWorkDayFromPunches`) — banco fica simples, lógica testável.
- **Soft delete** em `punch_records` mantém histórico íntegro; `audit_logs` reservado para próxima evolução.
- **Tema único** centralizado em `src/theme` evita estilos órfãos.
- **Logo SVG inline** (`components/Logo`) — sem necessidade de PNG, escala perfeita em qualquer densidade.

---

## 11. Próximos passos sugeridos

- Substituir `hashPassword` por bcrypt (`react-native-bcrypt`) ou Argon2 nativo.
- `expo-notifications` para alertas reais (atualmente só notifs locais persistidas).
- Picker de data/hora nativo nas telas de uso/agendamento (DateTimePicker).
- Exportação de relatório em PDF via `expo-print`.
- Testes unitários dos serviços (`calc.ts`, `validateNextPunch`) com Jest.
- EAS Update para deploys OTA.

---

Feito com ❤ para São Geraldo. Seu tempo, seu controle.
