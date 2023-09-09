import { makeExecutableSchema } from '@graphql-tools/schema'
import { calculateMaxNode } from './calculateMaxNode';
const typeDefs = `#graphql
  type Query {
    hello: String
    item: Item
    items(first: Int!): ItemConnection
  }
  type Item {
    id: ID!
    likedUsers(first: Int!): UserConnection
  }
  type ItemConnection {
    edges: [ItemEdge]
    pageInfo: PageInfo!
  }
  type ItemEdge {
    node: Item
    cursor: String!
  }
  type PageInfo {
    startCursor: String
    endCursor: String
    hasNextPage: Boolean!
    hadPreviousPage: Boolean!
  }
  type User {
    id: ID!
    name: String!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }
`;

const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {},
});

describe('calculateMaxNode', () => {
  it('should calculate max node', () => {
    const query = `
      query {
        item { # 1pt
          id
        }
        items(first: 10) { # 10pt
          edges {
            node {
              id
              likedUsers(first: 10) { # 10 * 10 = 100 pt
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `
    const result = calculateMaxNode(schema, query)
    expect(result).toBe(111)
  })
})