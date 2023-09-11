import {
  ASTNode,
  ASTVisitor,
  FieldNode,
  FragmentDefinitionNode,
  GraphQLSchema,
  parse,
  visit,
} from "graphql";
import { getFisrtOrLastArg, getParentTypeFromAncestors } from "./utils";

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

function inlineFragments(
  ast: ASTNode,
  fragmentDefs: Record<string, FragmentDefinitionNode>
): any {
  return visit(ast, {
    FragmentSpread: {
      enter(node) {
        const fragment = fragmentDefs[node.name.value];
        if (fragment) {
          return fragment.selectionSet;
        }
      },
    },
  });
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
  const ast = parse(query);
  const fragmentDefs: Record<string, FragmentDefinitionNode> = {};
  visit(ast, {
    FragmentDefinition: {
      enter(node) {
        fragmentDefs[node.name.value] = node;
      },
    },
  });
  const inlineAst = inlineFragments(ast, fragmentDefs);

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
  visit(inlineAst, astVisitor);
  return Math.floor(cost / 100);
}
