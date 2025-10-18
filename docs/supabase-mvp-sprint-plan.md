# Supabase MVP Delivery Plan

ContaCerta will ship a Supabase-backed MVP in three focused sprints. Each sprint is one week long and produces a shippable increment aligned with Auth, Categorias, Transações, Exportar CSV, and Orçamento requirements.

## Sprint 1 – Supabase foundation & Auth
**Objectives**
- Stand up Supabase project with required SQL schema, RLS, and storage policy groundwork.
- Integrate Supabase client and email OTP auth flow in Next.js 14 app router.

**Key Work Items**
- Apply `supabase/migrations/0001_init.sql` with tables, triggers, indexes, and policies as specified.
- Configure private "receipts" storage bucket policies via Supabase dashboard.
- Implement `src/lib/supabase.ts` client with session persistence.
- Build `/login` page for OTP auth and update Topbar to reflect session state.
- Document local setup steps (e.g., `.env.local`, Supabase CLI usage) for the team.

**Deliverables**
- Tested migration script checked into repo.
- Authenticated login experience accessible at `/login` with redirect support.
- Updated documentation covering environment configuration and auth flow QA steps.

## Sprint 2 – Categorias & Transações CRUD
**Objectives**
- Provide full lifecycle management for categories and account transactions using Supabase writes.
- Ensure domain modeling and validation matches business rules.

**Key Work Items**
- Introduce domain schemas (`src/domain/models.ts`) and formatting helpers (`src/domain/format.ts`).
- Add repository layer (`src/domain/repo.ts`) for authenticated data access with month filtering utilities.
- Implement `/categories` management UI wired to Supabase CRUD endpoints.
- Implement `/new` transaction creation page with validation, category selection, and navigation.
- Add navigation links in Sidebar and ensure mobile accessibility.
  - Ensure Sidebar links map to implemented screens (`/budgets/<ano-mes>`, `/new`, `/categories`, `/export`).

**Deliverables**
- Fully functional category and transaction creation flows against Supabase backend.
- Empty-state messaging and error handling consistent with UX guidelines.
- Updated docs describing CRUD flows and testing notes.

## Sprint 3 – Orçamento, Export, QA & Hardening
**Objectives**
- Surface key dashboards, CSV export, and ensure end-to-end quality.
- Harden session handling, loading states, and documentation.

**Key Work Items**
- Build orçamento landing page (`/`) que redireciona para o mês atual, garantindo visão consolidada e pronta para atribuições.
- Implement `/export` CSV generator reusing repository layer, ensuring proper encoding.
- Review Topbar/Sidebar integration for navigation & sign-out visibility.
- Execute full first-run flow QA (login, categories, transactions, dashboard, export) and capture findings.
- Finalize README/operational runbook updates, including Supabase storage policy instructions.

**Deliverables**
- Dashboard and export features meeting functional spec with responsive layout.
- QA checklist with results archived in repo documentation.
- Ready-to-demo Supabase-backed MVP aligned with security (RLS) requirements.
