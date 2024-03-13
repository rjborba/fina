import { TBill } from "@/models/Bill";
import { supabase } from "@/supabase/supabase";
import useSWR from "swr";
import { useAsyncCall } from "../useAsyncCall";

// const parser =

const fetcher = async () => {
  const { data, error } = await supabase.from("entries").select("*");

  if (error) {
    throw error;
  }

  return data as TBill[];
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type useBillsProps = {};
export const useBills = () => {
  const response = useSWR<TBill[]>(`something`, fetcher);

  const add = async () => {
    return supabase
      .from("entries")
      .insert([
        {
          description: "NEW ITEM",
          category: "SOME CATEGORY",
          value: 200,
          purchased_at: new Date(),
        },
      ])
      .select()
      .then((result) => {
        if (result.error) {
          throw result.error;
        }

        if (!result.count) {
          throw new Error("No row modified");
        }

        return result.data;
      });
  };

  const remove = () => {};

  const update = () => {};

  return {
    response,
    mutate: {
      add: useAsyncCall(add),
      remove,
      update,
    },
  };
};
