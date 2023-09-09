import { makeExecutableSchema } from '@graphql-tools/schema'
import { calculateMaxNode } from './calculateMaxNode';
const typeDefs = `#graphql
  type Query {
    hello: String
    item: Item
    items(first: Int!): ItemConnection
  }
  type Mutation {
    updateItem(id: ID!): Item
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
  describe('query', () => {
    it('should calculate the max node count with considering a first argument', () => {
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

    it('should calculate the max node count with considering a last argument', () => {
      const query = `
        query {
          item { # 1pt
            id
          }
          items(last: 10) { # 10pt
            edges {
              node {
                id
                likedUsers(last: 10) { # 10 * 10 = 100 pt
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

  describe('mutation', () => {
    it ('should calculate the max node count with considering a first argument', () => {
      const query = `
        mutation {
          updateItem(id: "1") { # 1pt
            id
            likedUsers(first: 10) { # 10 pt
              edges {
                cursor
                node {
                  id
                }
              }
            }
          }
        }`
      const result = calculateMaxNode(schema, query)
      expect(result).toBe(11)
    })
  })
})