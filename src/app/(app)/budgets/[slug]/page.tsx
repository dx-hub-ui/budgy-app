// src/app/(app)/budgets/[slug]/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import { BudgetGrid } from "@/components/orcamento/BudgetGrid";
import { BudgetTopbar } from "@/components/orcamento/BudgetTopbar";
import { BudgetInsightsPanel } from "@/components/orcamento/BudgetInsightsPanel";
import { CategoryDrawer } from "@/components/orcamento/CategoryDrawer";
import { CategoryNameModal } from "@/components/orcamento/CategoryNameModal";
import { mesAtual } from "@/domain/budgeting";
import {
  budgetPlannerSelectors,
  useBudgetPlannerStore
} from "@/stores/budgetPlannerStore";

function shiftMonth(month: string, delta: number) {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, (monthPart ?? 1) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}`;
}

export default function BudgetMonthPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  const initializeMonth = useBudgetPlannerStore((s) => s.initializeMonth);
  const selecionarMes = useBudgetPlannerStore((s) => s.selecionarMes);
  const abrirModalNome = useBudgetPlannerStore((s) => s.abrirModalNome);
  const abrirDrawer = useBudgetPlannerStore((s) => s.abrirDrawer);
  const fecharOverlays = useBudgetPlannerStore((s) => s.fecharOverlays);
  const irParaPasso = useBudgetPlannerStore((s) => s.irParaPasso);
  const alternarOcultas = useBudgetPlannerStore((s) => s.alternarOcultas);
  const salvarNome = useBudgetPlannerStore((s) => s.salvarNome);
  const ocultarCategoria = useBudgetPlannerStore((s) => s.ocultarCategoria);
  const excluirCategoria = useBudgetPlannerStore((s) => s.excluirCategoria);
  const salvarMeta = useBudgetPlannerStore((s) => s.salvarMeta);
  const aplicarMeta = useBudgetPlannerStore((s) => s.aplicarMeta);
  const removerMeta = useBudgetPlannerStore((s) => s.removerMeta);
  const editarAtribuido = useBudgetPlannerStore((s) => s.editarAtribuido);
  const desfazer = useBudgetPlannerStore((s) => s.desfazer);
  const refazer = useBudgetPlannerStore((s) => s.refazer);
  const definirToast = useBudgetPlannerStore((s) => s.definirToast);
  const criarCategoria = useBudgetPlannerStore((s) => s.criarCategoria);

  const ui = budgetPlannerSelectors.useUI();
  const categories = budgetPlannerSelectors.useCategories();
  const monthSelected = budgetPlannerSelectors.useMonth();
  const currentMonth = monthSelected ?? mesAtual();
  const readyToAssign = budgetPlannerSelectors.useReadyToAssign(currentMonth);
  const totals = budgetPlannerSelectors.useTotals(currentMonth);
  const toast = budgetPlannerSelectors.useToast();
  const loading = budgetPlannerSelectors.useLoading();
  const error = useBudgetPlannerStore((s) => s.error);
  const allocations = useBudgetPlannerStore((s) => s.allocations.byCategoryIdMonth);
  const goals = useBudgetPlannerStore((s) => s.goals.byCategoryId);
  const history = useBudgetPlannerStore((s) => s.history);

  // Refs para controlar inicialização e sincronização sem loops
  const didInitRef = useRef(false);
  const syncingUrlRef = useRef(false);
  const initialMonthRef = useRef<string | null>(null);

  // Captura o mês inicial UMA VEZ no mount: query ?m ou slug ou atual
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const slugMonth = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
    let queryMonth: string | null = null;
    if (typeof window !== "undefined") {
      queryMonth = new URLSearchParams(window.location.search).get("m");
    }
    const initial = (queryMonth ?? slugMonth ?? mesAtual()).slice(0, 7);
    initialMonthRef.current = initial;

    // Inicializa store para este mês
    void initializeMonth(initial);

    // Limpa query `?m=` na URL apenas se existir e só uma vez
    if (typeof window !== "undefined" && queryMonth) {
      const desiredPath = `/budgets/${initial}`;
      if (window.location.pathname !== desiredPath) {
        syncingUrlRef.current = true;
        router.replace(desiredPath, { scroll: false });
        // solta o flag no próximo tick
        queueMicrotask(() => {
          syncingUrlRef.current = false;
        });
      }
    }
  }, [initializeMonth, params?.slug, router]);

  // Reage a mudanças reais de mês na store e sincroniza URL sem loop
  useEffect(() => {
    if (!monthSelected) return;
    if (syncingUrlRef.current) return;

    const desiredPath = `/budgets/${monthSelected}`;
    if (typeof window !== "undefined" && window.location.pathname !== desiredPath) {
      syncingUrlRef.current = true;
      router.replace(desiredPath, { scroll: false });
      queueMicrotask(() => {
        syncingUrlRef.current = false;
      });
    }
  }, [monthSelected, router]);

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => definirToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast, definirToast]);

  // Keybindings
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) refazer();
        else desfazer();
      }
      if (event.key === "Escape") fecharOverlays();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [desfazer, refazer, fecharOverlays]);

  const drawerCategory = categories.find((cat) => cat.id === ui.drawerCategoryId) ?? null;
  const modalCategory = categories.find((cat) => cat.id === ui.nameModalId) ?? null;
  const drawerGoal = drawerCategory ? goals[drawerCategory.id] : undefined;
  const drawerAllocation =
    drawerCategory && monthSelected ? allocations[drawerCategory.id]?.[monthSelected] : undefined;

  const handleAddCategory = (groupName: string) => {
    const input = window.prompt(`Nova categoria em ${groupName}`, "");
    if (!input) return;
    void criarCategoria(groupName, input).catch((error) => {
      console.error("Erro ao criar categoria", error);
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--cc-bg)] text-[var(--cc-text)]">
      <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
        <div className="flex h-full flex-col gap-6">
          <BudgetTopbar
            month={currentMonth}
            readyToAssignCents={readyToAssign}
            assignedCents={totals.assigned}
            activityCents={totals.activity}
            availableCents={totals.available}
            onGoPrevious={() => {
              if (!currentMonth) return;
              void selecionarMes(shiftMonth(currentMonth, -1));
            }}
            onGoNext={() => {
              if (!currentMonth) return;
              void selecionarMes(shiftMonth(currentMonth, 1));
            }}
            onOpenGroups={alternarOcultas}
            onUndo={desfazer}
            onRedo={refazer}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden xl:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
              {error && (
                <div className="rounded-2xl border border-[var(--state-danger)] bg-rose-50 px-4 py-3 text-sm text-rose-600 shadow-sm">
                  {error}
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {loading ? (
                  <div className="flex flex-1 items-center justify-center rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] text-sm text-[var(--cc-text-muted)] shadow-[var(--shadow-1)]">
                    Carregando orçamento…
                  </div>
                ) : (
                  <div className="h-full overflow-auto pr-1">
                    <BudgetGrid
                      month={currentMonth}
                      onEdit={(categoryId, value) => {
                        void editarAtribuido(categoryId, value);
                      }}
                      onOpenName={abrirModalNome}
                      onOpenDrawer={abrirDrawer}
                      onAddCategory={handleAddCategory}
                    />
                  </div>
                )}
              </div>
            </div>

            {currentMonth && (
              <BudgetInsightsPanel
                month={currentMonth}
                readyToAssignCents={readyToAssign}
                assignedCents={totals.assigned}
                activityCents={totals.activity}
                availableCents={totals.available}
              />
            )}
          </div>
        </div>
      </div>

      {modalCategory && (
        <CategoryNameModal
          category={modalCategory}
          onCancel={fecharOverlays}
          onConfirm={(name) => {
            void salvarNome(modalCategory.id, name);
          }}
          onHide={() => {
            void ocultarCategoria(modalCategory.id);
          }}
          onDelete={() => {
            void excluirCategoria(modalCategory.id);
          }}
        />
      )}

      {drawerCategory && monthSelected && (
        <CategoryDrawer
          category={drawerCategory}
          goal={drawerGoal}
          allocation={drawerAllocation}
          month={monthSelected}
          step={ui.wizardStep}
          onClose={fecharOverlays}
          onSaveGoal={(payload) => {
            void salvarMeta(drawerCategory.id, payload as any);
          }}
          onApplyGoal={() => {
            void aplicarMeta(drawerCategory.id);
          }}
          onRemoveGoal={() => {
            void removerMeta(drawerCategory.id);
          }}
          onChangeStep={irParaPasso}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500"
              : toast.type === "error"
              ? "bg-rose-500"
              : "bg-slate-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
