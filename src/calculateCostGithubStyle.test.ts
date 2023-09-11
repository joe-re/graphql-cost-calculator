import { schema } from "@octokit/graphql-schema";
import { buildClientSchema } from "graphql";
import { calculateCost } from "./calculateCostGithubStyle";

describe("test", () => {
  it("calculates cost", () => {
    const graphqlSchema = buildClientSchema(schema.json as any);
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
    `;
    const result = calculateCost({ schema: graphqlSchema, query });
    // 1 + 100 + 5000 = 5101
    expect(result).toBe(51);
  });
  describe("specify type cost", () => {
    it("applies specified type cost and calculates cost", () => {
      const graphqlSchema = buildClientSchema(schema.json as any);
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
      `;
      const result = calculateCost({
        schema: graphqlSchema,
        query,
        typeCostMap: { RepositoryConnection: 10 },
      });
      // 1 + 100 + 5000 + 1000(RepositoryConnection cost) = 6101
      expect(result).toBe(61);
    });
  });
  describe("variables", () => {
    it("calculates cost", () => {
      const graphqlSchema = buildClientSchema(schema.json as any);
      const query = `
      query queryCost($repositoryFirst: Int!, $issueFirst: Int!, $labelFirst: Int!) {
        viewer {
          login
          repositories(first: $repositoryFirst) {
            edges {
              node {
                id
    
                issues(first: $issueFirst) {
                  edges {
                    node {
                      id
    
                      labels(first: $labelFirst) {
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
    `;
      const result = calculateCost({ schema: graphqlSchema, query, variables: {
        repositoryFirst: 100,
        issueFirst: 50,
        labelFirst: 60,
      } });
      // 1 + 100 + 5000 = 5101
      expect(result).toBe(51);
    });
  });
});
