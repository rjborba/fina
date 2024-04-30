import { supabase } from "@/supabase/supabase";
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/supabase_types";
import { snakeToCamelType } from "@/tools/camelize";
import useSWR from "swr";
import { objectToCamel, objectToSnake } from "ts-case-convert";
import { useAsyncCall } from "../useAsyncCall";

export type TBill = snakeToCamelType<Tables<"entries">>;
export type TAddBillProps = snakeToCamelType<TablesInsert<"entries">>;
export type TUpdateBillProps = snakeToCamelType<TablesUpdate<"entries">>;

const fetcher = async () => {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at");

  if (error) {
    throw error;
  }

  return data.map(objectToCamel);
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type useBillsProps = {};

export const useBills = () => {
  const response = useSWR(`something`, fetcher);

  const add = async (bill: snakeToCamelType<TablesInsert<"entries">>) => {
    const billSnakeCase = objectToSnake(bill);

    // ID not used for creating a new Bill
    delete billSnakeCase.id;

    const { data, error } = await supabase
      .from("entries")
      .insert([billSnakeCase])
      .select();

    if (error) {
      throw error;
    }

    return objectToCamel(data);
  };

  const remove = async (billId: string) => {
    const { error } = await supabase.from("entries").delete().eq("id", billId);

    if (error) {
      throw error;
    }
  };

  const update = async (props: { billId: number; bill: TUpdateBillProps }) => {
    const billSnakeCase = objectToSnake(props.bill);

    // Created At should not be updatable
    delete props.bill.createdAt;

    const { data, error } = await supabase
      .from("entries")
      .update({ ...billSnakeCase })
      .eq("id", props.billId)
      .select();
    if (error) {
      throw error;
    }

    response.mutate((oldRecords) => {
      if (!oldRecords) {
        return undefined;
      }

      return oldRecords
        .map(
          (oldRecord) =>
            data.find((updateRecord) => updateRecord.id === oldRecord.id) ??
            oldRecord,
        )
        .map(objectToCamel);
    });

    return objectToCamel(data.map(objectToCamel));
  };

  return {
    response,
    mutate: {
      add: useAsyncCall(add),
      remove: useAsyncCall(remove),
      update: useAsyncCall(update),
    },
  };
};
