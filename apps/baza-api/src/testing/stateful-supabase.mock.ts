/**
 * In-memory Supabase double for JobApplicationService integration tests.
 * Supports the query chains used by apply, listForOwner, and getCvStreamForOwner.
 */

export type CompanyRow = {
  id: string;
  user_id: string;
};

export type JobOfferRow = {
  id: string;
  company_id: string;
  published: boolean;
  title: string;
};

export type JobApplicationRow = {
  id: string;
  job_offer_id: string;
  company_id: string;
  email: string;
  phone: string;
  message: string | null;
  cv_file_key: string;
  consent_accepted_at: string;
  created_at: string;
};

export type StatefulSupabaseStore = {
  companies: CompanyRow[];
  jobOffers: JobOfferRow[];
  jobApplications: JobApplicationRow[];
};

type Filter = { column: string; value: unknown };

type QueryState = {
  table: keyof StatefulSupabaseStore | null;
  operation: 'select' | 'insert';
  selectColumns: string;
  filters: Filter[];
  insertPayload: Record<string, unknown> | null;
  orderBy: { column: string; ascending: boolean } | null;
};

function tableKey(table: string): keyof StatefulSupabaseStore | null {
  if (table === 'companies') return 'companies';
  if (table === 'job_offers') return 'jobOffers';
  if (table === 'job_applications') return 'jobApplications';
  return null;
}

function pickColumns<T extends Record<string, unknown>>(
  row: T,
  columns: string
): Record<string, unknown> {
  const cols = columns.split(',').map((c) => c.trim());
  const out: Record<string, unknown> = {};
  for (const col of cols) {
    const joinMatch = /^(\w+)\((.+)\)$/.exec(col);
    if (joinMatch) {
      continue;
    }
    if (col in row) {
      out[col] = row[col];
    }
  }
  return out;
}

function attachJobOfferTitle(
  app: JobApplicationRow,
  store: StatefulSupabaseStore,
  selectColumns: string
): Record<string, unknown> {
  const base = pickColumns(app, selectColumns) as Record<string, unknown>;
  if (selectColumns.includes('job_offers(title)')) {
    const offer = store.jobOffers.find((o) => o.id === app.job_offer_id);
    base.job_offers = offer ? { title: offer.title } : null;
  }
  return base;
}

function matchesFilters(
  row: Record<string, unknown>,
  filters: Filter[]
): boolean {
  return filters.every((f) => row[f.column] === f.value);
}

let idCounter = 0;

function nextApplicationId(): string {
  idCounter += 1;
  return `app-${idCounter}`;
}

export function createEmptyStore(): StatefulSupabaseStore {
  return {
    companies: [],
    jobOffers: [],
    jobApplications: [],
  };
}

export function seedCompany(
  store: StatefulSupabaseStore,
  row: CompanyRow
): void {
  store.companies.push({ ...row });
}

export function seedOffer(
  store: StatefulSupabaseStore,
  row: JobOfferRow
): void {
  store.jobOffers.push({ ...row });
}

export function listApplicationsForCompany(
  store: StatefulSupabaseStore,
  companyId: string
): JobApplicationRow[] {
  return store.jobApplications.filter((a) => a.company_id === companyId);
}

function createQueryBuilder(store: StatefulSupabaseStore, state: QueryState) {
  const builder = {
    select(columns: string) {
      state.selectColumns = columns;
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    insert(payload: Record<string, unknown>) {
      state.operation = 'insert';
      state.insertPayload = payload;
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      state.orderBy = { column, ascending: options.ascending };
      return executeList();
    },
    async maybeSingle(): Promise<{ data: unknown; error: null }> {
      const key = state.table;
      if (!key) {
        throw new Error(
          'stateful-supabase mock: maybeSingle() on unsupported table'
        );
      }
      if (state.operation !== 'select') {
        throw new Error(
          `stateful-supabase mock: maybeSingle() requires select (got ${state.operation})`
        );
      }

      const rows = store[key] as Record<string, unknown>[];
      const match = rows.find((row) => matchesFilters(row, state.filters));
      if (!match) {
        return { data: null, error: null };
      }
      return {
        data: pickColumns(match, state.selectColumns),
        error: null,
      };
    },
    async single(): Promise<{ data: unknown; error: null }> {
      if (state.operation === 'insert' && state.insertPayload) {
        if (state.table !== 'jobApplications') {
          throw new Error(
            `stateful-supabase mock: insert only supported on job_applications (got ${String(state.table)})`
          );
        }
        const now = new Date().toISOString();
        const row: JobApplicationRow = {
          id: nextApplicationId(),
          job_offer_id: String(state.insertPayload.job_offer_id),
          company_id: String(state.insertPayload.company_id),
          email: String(state.insertPayload.email),
          phone: String(state.insertPayload.phone),
          message:
            state.insertPayload.message != null
              ? String(state.insertPayload.message)
              : null,
          cv_file_key: String(state.insertPayload.cv_file_key),
          consent_accepted_at: String(
            state.insertPayload.consent_accepted_at ?? now
          ),
          created_at: now,
        };
        store.jobApplications.push(row);
        return {
          data: pickColumns(row, state.selectColumns),
          error: null,
        };
      }
      throw new Error(
        'stateful-supabase mock: single() only supported after insert().select()'
      );
    },
  };

  async function executeList(): Promise<{ data: unknown; error: null }> {
    if (state.table !== 'jobApplications' || state.operation !== 'select') {
      throw new Error(
        `stateful-supabase mock: list/order only supported on job_applications select (got table=${String(state.table)}, op=${state.operation})`
      );
    }

    let rows = store.jobApplications.filter((row) =>
      matchesFilters(row as unknown as Record<string, unknown>, state.filters)
    );

    if (state.orderBy) {
      const { column, ascending } = state.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[column as keyof JobApplicationRow];
        const bv = b[column as keyof JobApplicationRow];
        if (av === bv) return 0;
        if (av == null) return ascending ? -1 : 1;
        if (bv == null) return ascending ? 1 : -1;
        return ascending
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    const data = rows.map((row) =>
      attachJobOfferTitle(row, store, state.selectColumns)
    );
    return { data, error: null };
  }

  return builder;
}

export function createStatefulSupabaseMock(initial?: Partial<StatefulSupabaseStore>) {
  idCounter = 0;
  const store: StatefulSupabaseStore = {
    companies: initial?.companies ?? [],
    jobOffers: initial?.jobOffers ?? [],
    jobApplications: initial?.jobApplications ?? [],
  };

  const from = (table: string) => {
    const key = tableKey(table);
    const state: QueryState = {
      table: key,
      operation: 'select',
      selectColumns: '*',
      filters: [],
      insertPayload: null,
      orderBy: null,
    };
    return createQueryBuilder(store, state);
  };

  const getClient = () => ({ from });

  return {
    store,
    getClient,
    from,
    seedCompany: (row: CompanyRow) => seedCompany(store, row),
    seedOffer: (row: JobOfferRow) => seedOffer(store, row),
    listApplicationsForCompany: (companyId: string) =>
      listApplicationsForCompany(store, companyId),
  };
}
