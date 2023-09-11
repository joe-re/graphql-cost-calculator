import { ASTNode, ArgumentNode, FragmentDefinitionNode, GraphQLObjectType, GraphQLSchema, ValueNode, getNamedType, visit } from "graphql";

function getValueFromVariable(
  valueNode: ValueNode,
  variables: Record<string, any>
): any {
  if (valueNode.kind === "Variable" && variables) {
    return variables[valueNode.name.value];
  }
  return null;
}

export function getFisrtOrLastArg(node: readonly ArgumentNode[], variables: Record<string, number> = {}): number | null {
  const firstOrLastArg = node.find(arg => arg.name.value === 'first' || arg.name.value === 'last');
  if (!firstOrLastArg) {
    return null
  }
  if (firstOrLastArg.value.kind === "Variable") {
    return getValueFromVariable(firstOrLastArg.value, variables);
  } else if (firstOrLastArg.value.kind === "IntValue") {
    return parseInt(firstOrLastArg.value.value, 10);
  }

  return null; 
}

export function getParentTypeFromAncestors(
  schema: GraphQLSchema,
  ancestors: readonly (ASTNode | readonly ASTNode[])[]
): GraphQLObjectType | null {
  let currentType: GraphQLObjectType | null = null;

  for (const ancestor of ancestors) {
    if ("kind" in ancestor && ancestor.kind === "OperationDefinition") {
      switch (ancestor.operation) {
        case "query":
          currentType = schema.getQueryType() || null;
          break;
        case "mutation":
          currentType = schema.getMutationType() || null;
          break;
        case "subscription":
          currentType = schema.getSubscriptionType() || null;
          break;
      }
    } else if ("kind" in ancestor && ancestor.kind === "Field" && currentType) {
      const fields = currentType.getFields();
      const field = fields[ancestor.name.value];
      if (field) {
        currentType = getNamedType(field.type) as GraphQLObjectType;
      }
    }
  }
  return currentType;
}

export function inlineFragments(ast: ASTNode) {
  const fragmentDefs: Record<string, FragmentDefinitionNode> = {};
  visit(ast, {
    FragmentDefinition: {
      enter(node) {
        fragmentDefs[node.name.value] = node;
      },
    },
  });
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