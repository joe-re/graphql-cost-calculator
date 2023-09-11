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
    totalCount: Int!
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
    totalCount: Int!
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
            totalConut
            edges {
              node {
                id
                likedUsers(first: 10) { # 10 * 10 = 100 pt
                  totalConut
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
      const result = calculateMaxNode({ schema, query })
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
              totalConut
              node {
                id
                likedUsers(last: 10) { # 10 * 10 = 100 pt
                  totalConut
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
      const result = calculateMaxNode({ schema, query })
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
      const result = calculateMaxNode({ schema, query })
      expect(result).toBe(11)
    })
  })

  describe('fragment', () => {
    it('should calculate the max node count with resolving fragment', () => {
      const query = `
        query {
          item { 
            id
          }
          items(first: 10) {
            edges {
              node {
                ...ItemFragment
              }
            }
          }
        }
      
        fragment ItemFragment on Item {
          id
          likedUsers(first: 10) {
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      `
      const result = calculateMaxNode({ schema, query })
      expect(result).toBe(111)
    })
  })

  describe('variables', () => {
    it('should calculate the max node count with resolving arguments', () => {
      const query = `
        query getItems($itemsFirst: Int!, $likedUsersFirst: Int!) {
          item { 
            id
          }
          items(first: $itemsFirst) {
            edges {
              node {
                ...ItemFragment
              }
            }
          }
        }
      
        fragment ItemFragment on Item {
          id
          likedUsers(first: $likedUsersFirst) {
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      `
      const result = calculateMaxNode({ schema, query, variables: { itemsFirst: 10, likedUsersFirst: 10 } })
      expect(result).toBe(111)
    })
  })
})