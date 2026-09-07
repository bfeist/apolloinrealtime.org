/** Join locally scoped CSS Module classes without leaking undefined values. */
export function cx(...classes: readonly (string | undefined | false)[]): string {
  return classes.filter((value): value is string => typeof value === "string").join(" ");
}
