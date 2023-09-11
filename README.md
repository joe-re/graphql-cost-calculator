# GraphQL Query Cost Calculator

This library offers a means to calculate the cost of a query, facilitating rate limiting similar to the [Github GraphQL API](https://docs.github.com/en/graphql/overview/resource-limitations).

NOTE: Currently, it's only compatible with schemas adhering to [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm).

## Installation

You can install the package using either npm or yarn.

```sh
npm install graphql-cost-calculator
```

```sh
yarn add graphql-cost-calculator
```

## Usage

```ts
import { calculateCost } from "graphql-cost-calculator";
import schema from "./schema"; // Import or build your schema

const result = calculateCost({
  schema,
  query: `
    query {
      viewer {
        login
        repositories(first: 100) {
          edges {
            node {
              id
              issues(first: 50) {
                edges {
                  node {
                    id
                    labels(first: 60) {
                      edges {
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `
})

console.log(result) // { maxNode: 305101, cost: 51 }
```

## Result

- MaxNode: This represents the estimated maximum node count.
- Cost: The computed cost. For more on this concept, refer to the [Github document](https://docs.github.com/en/graphql/overview/resource-limitations).

## Arguments

```ts
{
  schema: GraphQLSchema;
  query: string;
  variables?: Record<string, any>;
  typeCostMap?: Record<string, number>;
}
```

### typeCostMap

This lets you assign an additional weight to specific object types. If your query contains these specified object types, the cost calculator will append their respective weights.

```ts
const result = calculateCost({
  schema,
  query: `
    query {
      viewer {
        login
        repositories(first: 100) {
          edges {
            node {
              id
              issues(first: 50) {
                edges {
                  node {
                    id
                    labels(first: 60) {
                      edges {
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  typeCostMap: { RepositoryConnection: 10 }
})

// (1 + 100 + 5000 + 1000(RepositoryConnection cost) / 100 = 61
console.log(result) // { maxNode: 305101, cost: 61 }
```