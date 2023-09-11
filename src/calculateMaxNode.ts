import {
  parse,
  visit,
  GraphQLObjectType,
  isObjectType,
  GraphQLSchema,
  ASTNode,
  getNamedType,
  FieldNode,
} from "graphql";
import { getFisrtOrLastArg, getParentTypeFromAncestors, inlineFragments } from "./utils";

function getParentFields(ancestors: readonly (ASTNode | readonly ASTNode[])[]): FieldNode[] {
  return ancestors
    .filter((ancestor): ancestor is FieldNode => {
      if (!("kind" in ancestor)) {
        return false
      }
      return ancestor.kind === "Field"
    })
    .reverse();
}

function isEdgesInConnection(node: FieldNode, ancestors: readonly (ASTNode | readonly ASTNode[])[]) {
  if (node.name.value !== 'edges') {
    return false
  }
  const parentFields = getParentFields(ancestors);
  if (!parentFields[0]) {
    return false
  }
  const parentField = parentFields[0];
  return getFisrtOrLastArg(parentField.arguments || []) !== null
}

function isNodeInEdges(node: FieldNode, ancestors: readonly (ASTNode | readonly ASTNode[])[]) {
  if (node.name.value !== 'node') {
    return false
  }
  const parentFields = getParentFields(ancestors);
  if (!parentFields[0]) {
    return false
  }
  const parentField = parentFields[0];
  return parentField.name.value === 'edges'
}

export function calculateMaxNode(schema: GraphQLSchema, query: string) {
  const ast = inlineFragments(parse(query));
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
          if (isEdgesInConnection(node, ancestors)
            || isNodeInEdges(node, ancestors)) {
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
