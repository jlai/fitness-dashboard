import type { DefaultError } from "@tanstack/query-core";
import type { UseMutationOptions } from "@tanstack/react-query";

export default function mutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationOptions<TData, TError, TVariables, TContext> {
  return options;
}
