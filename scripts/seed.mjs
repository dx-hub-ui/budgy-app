import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const seedEmail = process.env.SEED_EMAIL ?? 'demo@contacerta.test';
const seedPassword = process.env.SEED_PASSWORD ?? 'ContaCerta123';

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureDemoUser() {
  const { data: existingUserData, error: fetchUserError } = await supabase.auth.admin.getUserByEmail(seedEmail);

  if (fetchUserError && fetchUserError.message !== 'User not found') {
    throw new Error(`Failed to lookup demo user: ${fetchUserError.message}`);
  }

  if (existingUserData?.user) {
    return existingUserData.user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create demo user: ${error?.message ?? 'unknown error'}`);
  }

  console.log(`Created demo user ${seedEmail} with password ${seedPassword}`);
  return data.user.id;
}

async function ensureProfile(userId) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email: seedEmail,
  });

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }
}

async function getOrgId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch profile org: ${error.message}`);
  }

  if (!data?.org_id) {
    throw new Error('Profile org_id is missing; run migrations before seeding.');
  }

  return data.org_id;
}

async function ensureAccounts(userId) {
  const definitions = [
    { name: 'Conta Corrente', type: 'checking', default_method: 'debito', group_label: 'Contas bancárias', sort: 0 },
    { name: 'Carteira', type: 'cash', default_method: 'dinheiro', group_label: 'Contas bancárias', sort: 1 },
    { name: 'Carteira Pix', type: 'cash', default_method: 'pix', group_label: 'Contas bancárias', sort: 2 },
    { name: 'Cartão de Crédito', type: 'credit', default_method: 'credito', group_label: 'Cartões de crédito', sort: 0 },
  ];

  const accounts = new Map();

  for (const definition of definitions) {
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', definition.name)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to lookup account ${definition.name}: ${fetchError.message}`);
    }

    if (existingAccount) {
      accounts.set(definition.name, existingAccount.id);
      continue;
    }

    const { data: insertedAccount, error: insertError } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: definition.name,
        type: definition.type,
        default_method: definition.default_method,
        group_label: definition.group_label,
        sort: definition.sort,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create account ${definition.name}: ${insertError.message}`);
    }

    accounts.set(definition.name, insertedAccount.id);
  }

  return accounts;
}

async function ensureCategories(userId) {
  const definitions = [
    { name: 'Alimentação', color: '#22c55e' },
    { name: 'Transporte', color: '#3b82f6' },
    { name: 'Lazer', color: '#f59e0b' },
    { name: 'Moradia', color: '#a855f7' },
    { name: 'Saúde', color: '#ef4444' },
  ];

  const categories = new Map();

  for (const definition of definitions) {
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', definition.name)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to lookup category ${definition.name}: ${fetchError.message}`);
    }

    if (existingCategory) {
      categories.set(definition.name, existingCategory.id);
      continue;
    }

    const { data: insertedCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: definition.name,
        color: definition.color,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create category ${definition.name}: ${insertError.message}`);
    }

    categories.set(definition.name, insertedCategory.id);
  }

  return categories;
}

async function ensureTransactions(orgId, categories, accounts) {
  const transactions = [
    {
      amount_cents: 34900,
      occurred_on: '2025-01-05',
      method: 'debito',
      description: 'Supermercado Semanal',
      category: 'Alimentação',
    },
    {
      amount_cents: 5900,
      occurred_on: '2025-01-08',
      method: 'pix',
      description: 'Corrida de aplicativo',
      category: 'Transporte',
    },
    {
      amount_cents: 12000,
      occurred_on: '2025-01-12',
      method: 'credito',
      description: 'Cinema com amigos',
      category: 'Lazer',
    },
    {
      amount_cents: 210000,
      occurred_on: '2025-01-01',
      method: 'pix',
      description: 'Aluguel Janeiro',
      category: 'Moradia',
    },
    {
      amount_cents: 8600,
      occurred_on: '2025-01-18',
      method: 'dinheiro',
      description: 'Consulta de rotina',
      category: 'Saúde',
    },
    {
      amount_cents: 35500,
      occurred_on: '2024-12-16',
      method: 'credito',
      description: 'Supermercado Festa de Fim de Ano',
      category: 'Alimentação',
    },
    {
      amount_cents: 4300,
      occurred_on: '2024-12-20',
      method: 'debito',
      description: 'Recarga de bilhete único',
      category: 'Transporte',
    },
    {
      amount_cents: 15000,
      occurred_on: '2024-12-22',
      method: 'pix',
      description: 'Presente de amigo secreto',
      category: 'Lazer',
    },
    {
      amount_cents: 210000,
      occurred_on: '2024-12-01',
      method: 'pix',
      description: 'Aluguel Dezembro',
      category: 'Moradia',
    },
    {
      amount_cents: 6400,
      occurred_on: '2024-12-27',
      method: 'debito',
      description: 'Farmácia pós festas',
      category: 'Saúde',
    },
    {
      amount_cents: 2500,
      occurred_on: '2025-01-15',
      method: 'pix',
      description: 'Café co-working',
      category: null,
    },
  ];

  const methodToAccount = new Map([
    ['debito', accounts.get('Conta Corrente')],
    ['dinheiro', accounts.get('Carteira')],
    ['pix', accounts.get('Carteira Pix')],
    ['credito', accounts.get('Cartão de Crédito')],
  ]);

  for (const transaction of transactions) {
    let query = supabase
      .from('account_transactions')
      .select('id')
      .eq('org_id', orgId)
      .eq('amount_cents', transaction.amount_cents)
      .eq('occurred_on', transaction.occurred_on)
      .eq('method', transaction.method)
      .eq('direction', transaction.direction ?? 'outflow')
      .limit(1);

    if (transaction.description) {
      query = query.eq('description', transaction.description);
    } else {
      query = query.is('description', null);
    }

    const { data: existingExpense, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to lookup transaction ${transaction.description ?? 'sem descrição'}: ${fetchError.message}`);
    }

    if (existingExpense) {
      continue;
    }

    const { error: insertError } = await supabase.from('account_transactions').insert({
      org_id: orgId,
      amount_cents: transaction.amount_cents,
      occurred_on: transaction.occurred_on,
      method: transaction.method,
      description: transaction.description,
      category_id: transaction.category ? categories.get(transaction.category) ?? null : null,
      memo: transaction.memo ?? null,
      account_id: methodToAccount.get(transaction.method) ?? null,
      direction: transaction.direction ?? 'outflow',
    });

    if (insertError) {
      throw new Error(`Failed to create transaction ${transaction.description ?? 'sem descrição'}: ${insertError.message}`);
    }
  }
}

async function main() {
  const userId = await ensureDemoUser();
  await ensureProfile(userId);
  const orgId = await getOrgId(userId);
  const [accounts, categories] = await Promise.all([
    ensureAccounts(userId),
    ensureCategories(userId),
  ]);
  await ensureTransactions(orgId, categories, accounts);
  console.log('Development data seeded successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
