/* eslint-disable no-unused-vars */
// TODO: Evaluate why function type definition complains about unused vars

import { SWRResponse } from "swr";

export type TEntityManager<T> = {
  response: SWRResponse<T>;
  mutate: TEntityManagerMutateMethods<T>;
};

export type TEntityManagerMutateMethods<T> = {
  add: (entity: T) => T;
  remove: (id: string) => void;
  update: (id: string, entity: Partial<T>) => T;
};
