/* eslint-disable no-unused-vars */
import { useState } from "react";

type TAsyncCall<T, Y> = {
  isLoading: boolean;
  data: T | undefined;
  error: unknown;
  execute: (args: Y) => Promise<T>;
};

export const useAsyncCall = <T, Y>(
  asyncFunction: (args: Y) => Promise<T>,
): TAsyncCall<T, Y> => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();

  const execute = async (args: Y) => {
    setIsLoading(true);
    setData(undefined);
    setError(undefined);
    return asyncFunction(args)
      .then((result) => {
        setError(undefined);
        setData(result);

        return result;
      })
      .catch((e) => {
        setError(e);
        throw e;
      })
      .finally(() => setIsLoading(false));
  };

  return { isLoading, error, data, execute };
};
