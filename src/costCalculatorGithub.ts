import { GraphQLSchema, parse, visit } from "graphql";
import { getFisrtOrLastArg } from "./utils";

export function calculateCost(schema: GraphQLSchema, query: string) {
  const ast = parse(query);
  let cost = 0;
  let multiplierStack: number[] = [1];
  visit(ast, {
    Field: {
      enter: (node, _key, _parent, _path, ancestors) => {
        const firstOrLastArg = getFisrtOrLastArg(node.arguments || [])
        if (firstOrLastArg === null) {
          return
        }
        const currentMultiplier = multiplierStack[multiplierStack.length - 1];
        cost += currentMultiplier
      }
    },
    SelectionSet: {
      enter(_node, _key, parent) {
        const parentField = parent as any;
        const firstOrLastArg = getFisrtOrLastArg(parentField.arguments || [])
        if (firstOrLastArg !== null) {
          const currentMultiplier =
            multiplierStack[multiplierStack.length - 1];
          multiplierStack.push(firstOrLastArg * currentMultiplier);
        } else {
          multiplierStack.push(multiplierStack[multiplierStack.length - 1]);
        }
      },
      leave() {
        multiplierStack.pop();
      },
    },
  });
  return Math.floor(cost / 100);
}