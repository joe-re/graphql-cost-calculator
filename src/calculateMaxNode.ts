import {
  parse,
  visit,
  GraphQLObjectType,
  isObjectType,
  isScalarType,
  GraphQLSchema,
  ASTNode,
  getNamedType,
  ArgumentNode,
} from "graphql";

function getParentTypeFromAncestors(
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

function getFisrtOrLastArg(node: readonly ArgumentNode[]): number | null {
  const firstOrLastArg = node.find(arg => arg.name.value === 'first' || arg.name.value === 'last');
  if (!firstOrLastArg) {
    return null
  }
  if (firstOrLastArg.value.kind !== 'IntValue') {
    return null
  }
  return parseInt(firstOrLastArg.value.value, 10);
}

export function calculateMaxNode(schema: GraphQLSchema, query: string) {
  const ast = parse(query);
  let cost = 0;
  let multiplierStack: number[] = [1];
  visit(ast, {
    Field: {
      enter: (node, _key, _parent, _path, ancestors) => {
        const currentMultiplier = multiplierStack[multiplierStack.length - 1];
        const parentType = getParentTypeFromAncestors(schema, ancestors);
        if (!parentType || !(parentType instanceof GraphQLObjectType)) {
          return;
        }

        const fieldDefinition = parentType.getFields()[node.name.value];
        if (!fieldDefinition) {
          return;
        }

        const namedType = getNamedType(fieldDefinition.type);

        if (!isObjectType(namedType)) {
          return;
        }

        const firstOrLastArg = getFisrtOrLastArg(node.arguments || []);
        if (firstOrLastArg !== null) {
          cost += firstOrLastArg * currentMultiplier;
        } else {
          if (node.name.value === 'node' || node.name.value === 'edges') {
            return
          }
          cost += 1;
        }
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
  return cost;
}
