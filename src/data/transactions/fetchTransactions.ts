import supabase from "@/supabaseClient";
import { Tables } from "@/database.types";
import dayjs from "dayjs";

export interface FetchTransactionsOptions {
  page: number;
  pageSize: number;
  groupdId: string;
  startDate?: Date;
  endDate?: Date;
  categoryIdList?: number[];
  accountIdList?: number[];
  search?: string;
}

type TransactionWithCategoryName = Tables<"transactions"> & {
  categoryName: string | null;
};

export interface FetchTransactionsResult {
  data: TransactionWithCategoryName[] | null;
  totalCount: number;
}

export const fetchTransactions = async ({
  page,
  pageSize,
  groupdId,
  startDate,
  endDate,
  categoryIdList,
  accountIdList,
  search,
}: FetchTransactionsOptions): Promise<FetchTransactionsResult> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const formattedStartDate = dayjs(startDate).format("YYYY-MM-DD");
  const formattedEndDate = dayjs(endDate).format("YYYY-MM-DD");

  let query = supabase
    .from("transactions")
    .select(
      `
      *,
      categories!left(name)
    `,
      { count: "exact" }
    )
    .eq("removed", false)
    .eq("group_id", groupdId)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  if (startDate) {
    query = query.or(
      `credit_due_date.gte.${formattedStartDate},and(credit_due_date.is.null,date.gte.${formattedStartDate})`
    );
  }

  if (endDate) {
    query = query.or(
      `credit_due_date.lte.${formattedEndDate},and(credit_due_date.is.null,date.lte.${formattedEndDate})`
    );
  }

  if (categoryIdList && categoryIdList.length > 0) {
    const withoutNull = categoryIdList.filter((current) => current !== null);
    if (categoryIdList.includes(-1)) {
      query = query.or(
        `category_id.is.null,category_id.in.(${withoutNull.join(",")})`
      );
    } else {
      query = query.in("category_id", withoutNull);
    }
  }

  if (accountIdList && accountIdList.length > 0) {
    query = query.in("account_id", accountIdList);
  }

  if (search) {
    query = query.ilike("description", `%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  const transformedData = data?.map((transaction) => ({
    ...transaction,
    categoryName: transaction.categories?.name ?? null,
  }));

  return {
    data: transformedData,
    totalCount: count || 0,
  };
};
