import { schema } from '@octokit/graphql-schema'
import { buildClientSchema } from 'graphql'
import { calculateCost } from './costCalculatorGithub'

describe('test', () => {
  it('should work', () => {
    console.log(schema)
    const graphqlSchema = buildClientSchema(schema.json as any)
    const query = `
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
    const result = calculateCost(graphqlSchema, query)
    expect(result).toBe(51)
  })
})