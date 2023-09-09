import {
  parse,
  visit,
  GraphQLObjectType,
  isObjectType,
  isScalarType,
  GraphQLSchema,
  ASTNode,
  getNamedType,
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

export function calculateMaxNode(schema: GraphQLSchema, query: string) {
  const ast = parse(query);
  let cost = 0;
  let multiplierStack: number[] = [1];
  visit(ast, {
    Field(node, _key, _parent, _path, ancestors) {
      const currentMultiplier = multiplierStack[multiplierStack.length - 1];
      const parentType = getParentTypeFromAncestors(schema, ancestors);
      if (!parentType || !(parentType instanceof GraphQLObjectType)) return;

      const fieldDefinition = parentType.getFields()[node.name.value];
      if (!fieldDefinition) return;

      const namedType = getNamedType(fieldDefinition.type);

      if (isObjectType(namedType)) {
        const firstOrLastArg = node.arguments?.find(arg => arg.name.value === 'first');
        if (firstOrLastArg && firstOrLastArg.value.kind === 'IntValue') {
          console.log(node.name.value)
          console.log(currentMultiplier)
          const count = parseInt(firstOrLastArg.value.value, 10);
          cost += count * currentMultiplier;
        } else {
          if (node.name.value === 'node' || node.name.value === 'edges') {
            return
          }
          cost += 1;
        }
      } else if (isScalarType(namedType)) {
        cost += 0;
      }
    },
    SelectionSet: {
      enter(_node, _key, parent) {
        const parentField = parent as any;
        const firstArg = parentField.arguments?.find(
          (arg: any) => arg.name.value === "first"
        );
        if (firstArg && firstArg.value.kind === "IntValue") {
          const count = parseInt(firstArg.value.value, 10);
          const currentMultiplier =
            multiplierStack[multiplierStack.length - 1];
          multiplierStack.push(count * currentMultiplier); // 新しい乗数をスタックに追加
        } else {
          multiplierStack.push(multiplierStack[multiplierStack.length - 1]);
        }
      },
      leave() {
        multiplierStack.pop(); // スコープを抜ける際に乗数をスタックから取り除く
      },
    },
  });
  return cost;
}
