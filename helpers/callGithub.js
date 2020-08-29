module.exports = callGithub;
const { graphql } = require("@octokit/graphql");
const util = require('util');

function callGithub() {
  let dateNow = 0;

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token f1045290944dae7b3d5417dae241136fe6b5ab1f`,
    },
  });

  const reposQuery = `query reposQuery($q: String!, $num: Int = 1) {
    search(type: REPOSITORY, query:$q, first:$num) {
      nodes {
        ... on Repository {
          id
          name
          description
          nameWithOwner
          stargazers {
            totalCount
          }
          languages(first: 100) {
            nodes {
              name
            }
            totalCount
          }
          issues(states: OPEN, first: 100) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
              hasPreviousPage
              startCursor
            }
            nodes {
              id
              createdAt
              number
            }
          }
          owner {
            login
          }
        }
      }
    }
    rateLimit {
      limit
      remaining
      resetAt
      nodeCount
    }
  }`;

    
  const issueQuery = `query reposQuery($name: String!, $owner: String!, $cursor: String!, $num: Int = 100) {
    repository(name:$name, owner: $owner) {
      issues(states: OPEN, after: $cursor, first: $num) {
        pageInfo {
          endCursor
          startCursor
          hasNextPage
          hasPreviousPage
        }
        totalCount
        nodes {
          id
          createdAt
          number
        }
      }
    }
    rateLimit {
      limit
      remaining
      resetAt
      nodeCount
    }
  }`;

  
  function processIssueData(item, issueAux) {

    return new Promise(async (resolve, reject) => {

      let age = Math.round((dateNow - new Date(item.createdAt)) / (1000*60*60*24));

      let obj = {
        id : item.id,
        number : item.number,
        createdAt : item.createdAt,
        age : age
      }
      issueAux.ages.push(age);
      issueAux.issues.push(obj);
      resolve(true)
    });
  }
  
  async function getIssues(name, owner, last_issue_cursor, left_issues, issuesNodes, callback) {
    try {
      await graphqlWithAuth({
        query: issueQuery,
        name: name,
        owner: owner,
        cursor: last_issue_cursor
        // num: 10
      }).then(async (result) => {

        last_issue_cursor = result.repository.issues.pageInfo.endCursor;
        left_issues -= result.repository.issues.nodes.length;
        issuesNodes = issuesNodes.concat(result.repository.issues.nodes);
        
        if (left_issues == 0) {
          let issueAux = {
            issues : [],
            ages : []
          }
          dateNow = new Date();
          let status = await Promise.all(issuesNodes.map(element => processIssueData(element, issueAux)));
          
          callback(null, issueAux);

        } else {

          getIssues(name, owner, last_issue_cursor, left_issues, issuesNodes, callback);
        }
      }).catch((err) => {
        console.log(`err`);
        console.log(err);
        callback(err);
      });

    } catch (error) {
      console.log("error on graphqlWithAuth issues");
      console.log(error);
      callback(error);
    }
  }

  function processRepoData(repo, res, q) {
    return new Promise(async (resolve, reject) => {

      const obj = {
        id : repo.id,
        name : repo.name,
        owner : repo.owner.login,
        nameWithOwner : repo.nameWithOwner,
        description : repo.description,
        homepage : repo.homepage,
        stars : repo.stargazers.totalCount,
        lang : repo.languages.nodes.flatMap(x => x.name),
        search : q,
        total_issues : repo.issues.totalCount,
        avg_age : 0,
        std_age : 0,
      }

      if (repo.issues.totalCount > 0) {
        let left_issues = repo.issues.totalCount - repo.issues.nodes.length;
        let last_issue_cursor = repo.issues.pageInfo.endCursor;
        const issuesEdges = repo.issues.nodes;
        
        getIssues(obj.name, obj.owner, last_issue_cursor, left_issues, issuesEdges, (err, issueAux) => {
          if (err) {
            console.log(`processRepoData > getIssues : err = ${util.inspect(err, null, 4)}`);
            reject(err);
          }
        
          if (obj.total_issues > 0) {
            obj.avg_age = Math.round(issueAux.ages.reduce((a,b) => a + b, 0) / issueAux.ages.length);

            let m = issueAux.ages.reduce(function (a, b) {
              return Number(a) + Number(b);
            }) / issueAux.ages.length;

            let result = Math.round(Math.sqrt(issueAux.ages.reduce(function (sq, n) {
              return sq + Math.pow(n - m, 2);
            }, 0) / (issueAux.ages.length - 1)));
            obj.std_age = result;
          }

          res.data.push(obj);
          resolve(true)
        });
      } else {
        res.data.push(obj);
        resolve(true)
      }
    });
  }
  
  this.getRepos = async function(req, res, next) {

    try {
      
      await graphqlWithAuth({
        query: reposQuery,
        q: req.query.q,
        // num: 10
      }).then((result) => {

        res.data = [];

        if (result.search.nodes && result.search && result.search.nodes) {
          Promise.all(result.search.nodes.map(element => processRepoData(element,res,req.query.q)))
            .then((result) => {
              console.log('all resolved ', result)
              next();
            }).catch((err) => {
              console.log('error ', err)
            });
        }

      }).catch((err) => {
        console.log(`err`);
        console.log(err);
        res.err = err;
        next();
      });

    } catch (error) {
      console.log("error on graphqlWithAuth repos");
      console.log(error);
      res.err = error;
      next();
    }
  }
}