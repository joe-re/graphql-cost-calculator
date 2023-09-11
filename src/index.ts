import { GraphQLSchema } from "graphql";
import { calculateMaxNode } from "./calculateMaxNode";
import { calculateCost as calculateCostGithubStyle } from "./calculateCostGithubStyle";

export function calculateCost(params: {
  schema: GraphQLSchema;
  query: string;
  variables?: Record<string, any>;
  typeCostMap?: Record<string, number>;
}) {
  const maxNode = calculateMaxNode(params);
  const cost = calculateCostGithubStyle(params);
  return {
    maxNode,
    cost,
  }
}