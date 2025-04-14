import supabase from "@/supabaseClient";
import { Tables } from "@/database.types";

export interface FetchTransactionsOptions {
  page: number;
  pageSize: number;
  groupdId: string;
  startDate?: string;
  endDate?: string;
  category_ids?: (number | null)[];
  account_ids?: number[];
}

export interface FetchTransactionsResult {
  data: Tables<"transactions">[] | null;
  totalCount: number;
}

export const fetchTransactions = async ({
  page,
  pageSize,
  groupdId,
  startDate,
  endDate,
  category_ids,
  account_ids,
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

  if (category_ids && category_ids.length > 0) {
    const withoutNull = category_ids.filter((current) => current !== null);
    if (category_ids.includes(null)) {
      query = query.or(
        `category_id.is.null,category_id.in.(${withoutNull.join(",")})`
      );
    } else {
      query = query.in("category_id", withoutNull);
    }
  }

  if (account_ids && account_ids.length > 0) {
    query = query.in("account_id", account_ids);
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
