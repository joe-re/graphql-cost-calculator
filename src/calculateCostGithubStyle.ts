import {
  ASTNode,
  ASTVisitor,
  FieldNode,
  GraphQLSchema,
  parse,
  visit,
} from "graphql";
import { getFisrtOrLastArg, getParentTypeFromAncestors, inlineFragments } from "./utils";

function getTypeCost(
  schema: GraphQLSchema,
  ancestors: readonly (ASTNode | readonly ASTNode[])[],
  node: FieldNode,
  typeCostMap: Record<string, number>
) {
  const parentType = getParentTypeFromAncestors(schema, ancestors);
  const field = parentType?.getFields()[node.name.value];
  if (!field) {
    return 0;
  }
  const typeName = field.type.toString().replace(/[\[\]!]/g, "");
  return typeCostMap[typeName] || 0;
}

export function calculateCost({
  schema,
  query,
  variables,
  typeCostMap,
}: {
  schema: GraphQLSchema;
  query: string;
  variables?: Record<string, any>;
  typeCostMap?: Record<string, number>;
}) {
  const ast = inlineFragments(parse(query));

  let cost = 0;
  let multiplierStack: number[] = [1];
  const astVisitor: ASTVisitor = {
    Field: {
      enter: (node, _key, _parent, _path, ancestors) => {
        const firstOrLastArg = getFisrtOrLastArg(
          node.arguments || [],
          variables || {}
        );
        if (firstOrLastArg === null) {
          return;
        }
        const currentMultiplier = multiplierStack[multiplierStack.length - 1];
        cost += currentMultiplier;
        const typeCost = getTypeCost(
          schema,
          ancestors,
          node,
          typeCostMap || {}
        );
        if (typeCost > 0) {
          cost += typeCost * firstOrLastArg * currentMultiplier;
        }
      },
    },
    SelectionSet: {
      enter(_node, _key, parent) {
        const parentField = parent as any;
        const firstOrLastArg = getFisrtOrLastArg(
          parentField.arguments || [],
          variables || {}
        );
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
  };
  visit(ast, astVisitor);
  return Math.floor(cost / 100);
}
