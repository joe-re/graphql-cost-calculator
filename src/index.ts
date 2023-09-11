import { GraphQLSchema } from "graphql";
import { calculateMaxNode } from "./calculateMaxNode";
import { calculateCost as calculateCostGithubStyle } from "./calculateCostGithubStyle";

export function calculateCost(schema: GraphQLSchema, query: string) {
  const maxNode = calculateMaxNode(schema, query);
  const cost = calculateCostGithubStyle(schema, query);
  return {
    maxNode,
    cost,
  }
}