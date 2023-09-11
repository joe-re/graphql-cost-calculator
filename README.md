# GraphQL Query Cost Calculator

This library provides query cost calculation for implemting rate limiting like [Github GraphQL API](https://docs.github.com/en/graphql/overview/resource-limitations).

NOTE: For now it only works for schemas that follow [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm).

## Installation

Install the package via npm or yarn.

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

- MaxNode: Estimated max node count.
- Cost: Calculated cost. (see [Github document](https://docs.github.com/en/graphql/overview/resource-limitations) to know the concept.)

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

You can set an additional object type weight for some objects.
When your query includes some mached object types, the cost calculator adds weight for them.

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