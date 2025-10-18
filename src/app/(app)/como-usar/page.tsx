import { mesAtual } from "@/domain/budgeting";
import Link from "next/link";

const rules = [
  {
    title: "Regra 1 — Dê um trabalho a cada real",
    description:
      "Todo valor recebido precisa ser distribuído imediatamente. Use o painel de Orçamento para alocar o saldo disponível entre categorias claras e objetivas.",
    actions: [
      "Crie categorias com objetivos explícitos e defina metas mensais para manter a intenção visível.",
      "Utilize o indicador de saldo disponível para garantir que nenhum centavo permaneça sem destino.",
      "Acompanhe a coluna “Objetivo” para validar se as alocações cobrem compromissos futuros."
    ]
  },
  {
    title: "Regra 2 — Planeje para gastos não mensais",
    description:
      "Despesas sazonais são previsíveis; trate-as como compromissos em câmera lenta. Transforme cada uma em uma categoria de fundo e automatize contribuições.",
    actions: [
      "Cadastre metas de contribuição mensal e permita que o Budgy calcule quanto reservar a cada ciclo.",
      "Revise o painel de metas antes de distribuir um novo salário para priorizar fundos que estão atrasados.",
      "Visualize as barras de progresso para saber se você está em dia com datas críticas (IPVA, matrícula, seguros)."
    ]
  },
  {
    title: "Regra 3 — Ajuste conforme a realidade muda",
    description:
      "Orçamento não é prisão. Ao perceber que uma categoria ficou apertada, realoque valores de outra categoria com menor prioridade.",
    actions: [
      "Use o comando “Mover valores entre categorias” diretamente na tabela do orçamento.",
      "Documente o motivo no campo de notas da transação para criar histórico e aprender com padrões.",
      "Revise semanalmente o relatório de variação para enxergar categorias que pedem reforço estrutural."
    ]
  },
  {
    title: "Regra 4 — Faça o dinheiro ficar mais velho",
    description:
      "Estabilidade significa pagar o mês atual com o dinheiro do mês passado. Acompanhe a métrica Idade do Dinheiro e use-a como bússola.",
    actions: [
      "Cultive uma reserva mínima de um mês de despesas fixas antes de avançar para objetivos mais agressivos.",
      "Evite resgatar fundos de longo prazo para cobrir gastos imediatos; prefira ajustes entre categorias operacionais.",
      "Quando a idade cair, investigue quais categorias exigiram resgates emergenciais e ajuste as metas correspondentes."
    ]
  }
];

const categoryGroups = [
  {
    title: "Necessidades Fixas",
    description: "Gastos que mantêm a casa funcionando todos os meses.",
    items: [
      "Moradia (aluguel, condomínio, energia)",
      "Alimentação (mercado, delivery essencial)",
      "Contas essenciais (água, internet, telefone)",
      "Transporte (combustível, transporte público)",
      "Saúde (consultas, remédios recorrentes)"
    ]
  },
  {
    title: "Fundos de Reserva",
    description: "Prevenção contra gastos previsíveis de baixa frequência.",
    items: [
      "IPVA / Licenciamento",
      "Seguro residencial e automotivo",
      "Presentes e datas comemorativas",
      "Manutenção da casa e do carro"
    ]
  },
  {
    title: "Qualidade de Vida",
    description: "Espaço para decisões conscientes que geram bem-estar.",
    items: [
      "Lazer (cinema, bar, passeios)",
      "Assinaturas e entretenimento",
      "Roupas e cuidados pessoais",
      "Educação e cursos"
    ]
  },
  {
    title: "Poupança e Objetivos",
    description: "Construção de futuro e realização de planos.",
    items: [
      "Reserva de Emergência",
      "Investimentos recorrentes",
      "Viagens e experiências",
      "Grandes compras planejadas"
    ]
  }
];

const routines = [
  {
    frequency: "Diariamente",
    tasks: [
      "Registrar novas transações assim que acontecerem.",
      "Conferir se os saldos bancários e o Budgy continuam sincronizados.",
      "Categorizar despesas pendentes para manter os relatórios limpos."
    ]
  },
  {
    frequency: "Semanalmente",
    tasks: [
      "Revisar categorias variáveis (mercado, lazer, transporte) e mover valores quando necessário.",
      "Atualizar notas e anexos de transações relevantes para guardar contexto.",
      "Checar metas de fundos e reforçar aquelas que ficaram abaixo da linha do tempo prevista."
    ]
  },
  {
    frequency: "Mensalmente",
    tasks: [
      "Distribuir toda nova renda no orçamento usando o botão “Distribuir saldo”.",
      "Reavaliar objetivos de longo prazo e ajustar os valores automáticos de contribuição.",
      "Arquivar categorias que não fazem mais sentido para manter o painel focado."
    ]
  }
];

const principles = [
  {
    title: "Clareza total",
    detail:
      "Cada categoria precisa ter um nome autoexplicativo. Se a equipe não entende, renomeie. Transparência gera alinhamento familiar."
  },
  {
    title: "Ação intencional",
    detail:
      "Gastar é executar um plano definido anteriormente. Confirme se a categoria possui saldo antes de concluir qualquer compra."
  },
  {
    title: "Adaptação contínua",
    detail:
      "Mudanças de prioridade são registradas no orçamento, não na memória. Use o histórico de movimentações para relembrar por que ajustes foram feitos."
  },
  {
    title: "Estabilidade crescente",
    detail:
      "Quanto mais velho o dinheiro, mais liberdade para decidir com calma. Monitore a métrica na página de Visão Geral e comemore marcos (30, 60, 90 dias)."
  }
];

const delta = {
  covered: [
    "Fundamento do método e explicação das quatro regras com exemplos aplicados à interface.",
    "Estrutura sugerida de categorias organizada em grupos com descrições práticas.",
    "Rotina de revisão diária, semanal e mensal com tarefas acionáveis.",
    "Princípios do Sistema Budgy convertidos em comportamentos observáveis."
  ],
  missing: [
    "Automação completa de metas mensais ainda depende de integrações futuras com bancos.",
    "Visuais dedicados para acompanhar a idade do dinheiro em tempo real (atualmente disponível apenas em resumo).",
    "Fluxos guiados para criar categorias de fundos com sugestões inteligentes ainda estão em planejamento."
  ]
};

export default function HowToUsePage() {
  return (
    <div className="mx-auto w-full max-w-[var(--cc-content-maxw)] px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <div className="cc-stack-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
            Guia do método
          </p>
          <h1 className="cc-section-title text-3xl">Como usar o Budgy na prática</h1>
          <p className="cc-section-sub text-base leading-relaxed">
            O Budgy é a ferramenta que torna o Método Orçamento com Propósito executável. Esta página transforma o documento oficial em passos claros dentro da plataforma, para que você mantenha o foco em decisões conscientes sobre o dinheiro.
          </p>
        </div>
      </header>

      <div className="cc-stack-24">
        <section className="cc-card p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">1. Fundamento</h2>
            <p className="text-sm leading-relaxed text-[var(--cc-text)]">
              Você não controla gastos: você dá propósito a cada real. Todo valor que entra deve encontrar uma categoria imediatamente. No Budgy, isso significa distribuir o saldo disponível na tela de <Link className="font-medium text-[var(--cc-accent)]" href={`/budgets/${mesAtual()}`}>
                Orçamento
              </Link> até que o indicador &ldquo;A distribuir&rdquo; chegue a zero.
            </p>
            <p className="text-sm leading-relaxed text-[var(--cc-text)]">
              O saldo global representa apenas decisões ainda não executadas. Ao registrar uma despesa, você está cumprindo o plano desenhado previamente.
            </p>
          </div>
        </section>

        <section className="cc-card p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">2. As quatro regras em ação</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              As regras abaixo formam o núcleo do método. Cada uma ganhou instruções passo a passo conectadas aos recursos da plataforma.
            </p>
            <div className="cc-stack-24">
              {rules.map((rule) => (
                <article key={rule.title} className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                  <div className="cc-stack-24">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--cc-text)]">{rule.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--cc-text)]">{rule.description}</p>
                    </div>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--cc-text)]">
                      {rule.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cc-card p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">3. Estruture seu orçamento por grupos</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Comece com a estrutura recomendada e adapte conforme sua realidade. Os grupos abaixo mantêm clareza sobre prioridades e ajudam a identificar sobras.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryGroups.map((group) => (
                <article key={group.title} className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                  <div className="cc-stack-24">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--cc-text)]">{group.title}</h3>
                      <p className="mt-1 text-sm text-[var(--cc-text-muted)]">{group.description}</p>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--cc-text)]">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-sm text-[var(--cc-text)]">
              Sempre que criar novas categorias, registre um objetivo claro. Isso facilita discussões familiares e evita que o orçamento se torne apenas uma planilha cheia de números.
            </p>
          </div>
        </section>

        <section className="cc-card p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">4. Rotina de aplicação</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Transforme o método em hábito adotando cadências regulares. Use lembretes no calendário e concentre as revisões nos blocos sugeridos.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {routines.map((routine) => (
                <article key={routine.frequency} className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
                    {routine.frequency}
                  </h3>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--cc-text)]">
                    {routine.tasks.map((task) => (
                      <li key={task} className="leading-relaxed">
                        {task}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="text-sm text-[var(--cc-text)]">
              A disciplina curta e frequente evita acúmulo de decisões. Ao seguir o ritmo, o orçamento se mantém confiável e decisões importantes ficam leves.
            </p>
          </div>
        </section>

        <section className="cc-card p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">5. Princípios que guiam o Budgy</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              Use estes princípios como checklist mental antes de finalizar qualquer movimentação financeira.
            </p>
            <dl className="grid gap-4 md:grid-cols-2">
              {principles.map((principle) => (
                <div key={principle.title} className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                  <dt className="text-base font-semibold text-[var(--cc-text)]">{principle.title}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--cc-text)]">{principle.detail}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-[var(--cc-text)]">
              A missão do Budgy é transformar o relacionamento com o dinheiro em uma prática consciente. A plataforma não dita regras; ela executa o plano que você decidiu.
            </p>
          </div>
        </section>

        <section className="cc-card bg-[var(--cc-surface)] p-6">
          <div className="cc-stack-24">
            <h2 className="text-xl font-semibold text-[var(--cc-text)]">6. Delta entre documento e implementação</h2>
            <p className="text-sm text-[var(--cc-text-muted)]">
              O documento original define a filosofia completa do método. Abaixo você encontra o que já está disponível na plataforma e o que ainda está no roteiro de evolução.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                <h3 className="text-base font-semibold text-[var(--cc-text)]">Coberto na plataforma</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--cc-text)]">
                  {delta.covered.map((item) => (
                    <li key={item} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-dashed border-[var(--cc-border)] bg-[var(--cc-bg)] p-5">
                <h3 className="text-base font-semibold text-[var(--cc-text)]">Ainda em evolução</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--cc-text)]">
                  {delta.missing.map((item) => (
                    <li key={item} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-[var(--cc-text-muted)]">
              Versão do método: 1.0 • Última revisão: {new Date().getFullYear()}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
