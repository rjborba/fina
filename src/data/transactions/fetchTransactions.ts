import supabase from "@/supabaseClient";

export interface FetchTransactionsOptions {
  page: number;
  pageSize: number;
  groupdId: string;
  startDate?: string;
  endDate?: string;
  category_id?: number | null;
}

export interface FetchTransactionsResult {
  data: any[];
  totalCount: number;
}

export const fetchTransactions = async ({
  page,
  pageSize,
  groupdId,
  startDate,
  endDate,
  category_id,
}: FetchTransactionsOptions): Promise<FetchTransactionsResult> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("removed", false)
    .eq("group_id", groupdId)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  if (startDate) {
    query = query.or(
      `credit_due_date.gte.${startDate},and(credit_due_date.is.null,date.gte.${startDate})`
    );
  }

  if (endDate) {
    query = query.or(
      `credit_due_date.lte.${endDate},and(credit_due_date.is.null,date.lte.${endDate})`
    );
  }

  if (category_id !== undefined) {
    if (category_id === null) {
      query = query.is("category_id", null);
    } else {
      query = query.eq("category_id", category_id);
    }
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return {
    data,
    totalCount: count || 0,
  };
};
