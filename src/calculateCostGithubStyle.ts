import { ASTNode, FieldNode, GraphQLSchema, parse, visit } from "graphql";
import { getFisrtOrLastArg, getParentTypeFromAncestors } from "./utils";

type CalculateCostOptions = {
  typeCostMap?: Record<string, number>;
};

function getTypeCost(
  schema: GraphQLSchema,
  ancestors: readonly (ASTNode | readonly ASTNode[])[],
  node: FieldNode,
  options?: CalculateCostOptions
) {
  if (!options?.typeCostMap) {
    return 0;
  }
  const parentType = getParentTypeFromAncestors(schema, ancestors);
  const field = parentType?.getFields()[node.name.value];
  if (!field) {
    return 0;
  }
  const typeName = field.type.toString().replace(/[\[\]!]/g, "");
  return options.typeCostMap[typeName] || 0;
}

export function calculateCost(
  schema: GraphQLSchema,
  query: string,
  options?: CalculateCostOptions
) {
  const ast = parse(query);
  let cost = 0;
  let multiplierStack: number[] = [1];
  visit(ast, {
    Field: {
      enter: (node, _key, _parent, _path, ancestors) => {
        const firstOrLastArg = getFisrtOrLastArg(node.arguments || []);
        if (firstOrLastArg === null) {
          return;
        }
        const currentMultiplier = multiplierStack[multiplierStack.length - 1];
        cost += currentMultiplier;
        const typeCost = getTypeCost(schema, ancestors, node, options)
        if (typeCost > 0) {
          cost += (typeCost * firstOrLastArg * currentMultiplier)
        }
      },
    },
    SelectionSet: {
      enter(_node, _key, parent, _path, ancestors) {
        const parentField = parent as any;
        const firstOrLastArg = getFisrtOrLastArg(parentField.arguments || []);
        if (firstOrLastArg !== null) {
          const currentMultiplier = multiplierStack[multiplierStack.length - 1];
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
