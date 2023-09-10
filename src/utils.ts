import { ArgumentNode } from "graphql";

export function getFisrtOrLastArg(node: readonly ArgumentNode[]): number | null {
  const firstOrLastArg = node.find(arg => arg.name.value === 'first' || arg.name.value === 'last');
  if (!firstOrLastArg) {
    return null
  }
  if (firstOrLastArg.value.kind !== 'IntValue') {
    return null
  }
  return parseInt(firstOrLastArg.value.value, 10);
}