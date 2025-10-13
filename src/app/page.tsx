const indicadores = [
  { titulo: "Receitas", valor: "R$ 128.900", variacao: "+12,4% vs. mês anterior" },
  { titulo: "Despesas", valor: "R$ 97.350", variacao: "-4,8% vs. mês anterior" },
  { titulo: "Lucro líquido", valor: "R$ 31.550", variacao: "+8,2% vs. mês anterior" },
  { titulo: "Ticket médio", valor: "R$ 287", variacao: "+2,1% vs. mês anterior" },
];

const transacoes = Array.from({ length: 40 }).map((_, index) => ({
  id: index + 1,
  descricao: `Pagamento recebido #${index + 1}`,
  categoria: index % 2 === 0 ? "Vendas" : "Assinaturas",
  valor: index % 2 === 0 ? "+R$ 1.250,00" : "+R$ 480,00",
  data: new Date(Date.now() - index * 86_400_000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  }),
}));

export default function Page() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[var(--cc-content-maxw)] flex-col gap-6 px-4 py-6 md:px-8">
      <section aria-labelledby="resumo-financeiro" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="resumo-financeiro" className="text-2xl font-semibold text-[var(--cc-text)]">
              Visão geral financeira
            </h1>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Acompanhe a performance da ContaCerta em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--cc-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-[var(--cc-radius-1)] bg-[var(--cc-bg-elev)] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[var(--cc-accent)]" aria-hidden />
              Atualizado há 3 min
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {indicadores.map((indicador) => (
            <article
              key={indicador.titulo}
              className="rounded-[var(--cc-radius-2)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-4 shadow-sm"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[var(--cc-text-muted)]">{indicador.titulo}</h2>
              </header>
              <p className="mt-3 text-2xl font-semibold text-[var(--cc-text)]">{indicador.valor}</p>
              <p className="mt-2 text-xs text-[var(--cc-text-muted)]">{indicador.variacao}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="planejamento" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="planejamento" className="text-lg font-semibold text-[var(--cc-text)]">
            Planejamento mensal
          </h2>
          <button
            type="button"
            className="rounded-[var(--cc-radius-1)] border border-[var(--cc-border)] px-3 py-1.5 text-xs font-medium text-[var(--cc-text)] hover:border-[var(--cc-accent)] hover:text-[var(--cc-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)]"
          >
            Exportar relatório
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[var(--cc-radius-2)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-4">
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Metas do trimestre</h3>
            <p className="mt-2 text-sm text-[var(--cc-text-muted)]">
              Conclua o plano estratégico focando em margens, novos clientes e automação de cobranças.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--cc-text)]">
              <li className="flex items-center justify-between">
                <span>Margem operacional</span>
                <span className="rounded-full bg-[var(--cc-bg)] px-2 py-0.5 text-xs text-[var(--cc-text-muted)]">75%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Clientes enterprise</span>
                <span className="rounded-full bg-[var(--cc-bg)] px-2 py-0.5 text-xs text-[var(--cc-text-muted)]">68%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Automação de cobranças</span>
                <span className="rounded-full bg-[var(--cc-bg)] px-2 py-0.5 text-xs text-[var(--cc-text-muted)]">42%</span>
              </li>
            </ul>
          </article>
          <article className="rounded-[var(--cc-radius-2)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-4">
            <h3 className="text-sm font-semibold text-[var(--cc-text)]">Alertas de fluxo de caixa</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--cc-text)]">
              <li className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-[var(--cc-danger)] px-2 py-0.5 text-xs font-semibold text-white">Crítico</span>
                <span className="flex-1 text-left text-[var(--cc-text-muted)]">
                  Despesas com fornecedores aumentaram 17% na última semana.
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-[var(--cc-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--cc-text)]">Info</span>
                <span className="flex-1 text-left text-[var(--cc-text-muted)]">
                  Há 5 contratos próximos do vencimento. Priorize renovações automáticas.
                </span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="ultimas-transacoes" className="space-y-4 pb-10">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-[var(--cc-radius-1)] bg-[var(--cc-bg)]/85 px-3 py-2 backdrop-blur">
          <div>
            <h2 id="ultimas-transacoes" className="text-lg font-semibold text-[var(--cc-text)]">
              Últimas transações
            </h2>
            <p className="text-xs text-[var(--cc-text-muted)]">Visualize entradas mais recentes da ContaCerta.</p>
          </div>
          <span className="hidden text-xs text-[var(--cc-text-muted)] sm:inline">Ordenado por data desc.</span>
        </div>
        <div className="overflow-hidden rounded-[var(--cc-radius-2)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)]">
          <table className="min-w-full divide-y divide-[var(--cc-border)] text-sm">
            <thead className="bg-[var(--cc-bg)]/60 text-left uppercase tracking-wide text-[var(--cc-text-muted)]">
              <tr>
                <th scope="col" className="px-4 py-3">Descrição</th>
                <th scope="col" className="px-4 py-3">Categoria</th>
                <th scope="col" className="px-4 py-3 text-right">Valor</th>
                <th scope="col" className="px-4 py-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cc-border)] text-[var(--cc-text)]">
              {transacoes.map((transacao) => (
                <tr key={transacao.id} className="hover:bg-[var(--cc-bg)]/60">
                  <td className="px-4 py-3 font-medium">{transacao.descricao}</td>
                  <td className="px-4 py-3 text-[var(--cc-text-muted)]">{transacao.categoria}</td>
                  <td className="px-4 py-3 text-right font-mono">{transacao.valor}</td>
                  <td className="px-4 py-3 text-right text-[var(--cc-text-muted)]">{transacao.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
