export type CamelToSnakePropType<
  T extends string,
  P extends string = "",
> = string extends T
  ? string
  : T extends `${infer C0}${infer R}`
    ? CamelToSnakePropType<
        R,
        `${P}${C0 extends Lowercase<C0> ? "" : "_"}${Lowercase<C0>}`
      >
    : P;

export type CamelToSnakeType<T> = {
  [K in keyof T as CamelToSnakePropType<string & K>]: T[K];
};

type SnakeToCamelType<S extends string> = S extends `${infer F}_${infer R}`
  ? `${Lowercase<F>}${Capitalize<SnakeToCamelType<R>>}`
  : S;

export type snakeToCamelType<T> = {
  [K in keyof T as SnakeToCamelType<string & K>]: T[K];
};
