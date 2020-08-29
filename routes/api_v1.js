function apiv1(options) {
  const express = require('express');
  const apiv1 = express.Router();

  const callGithub = options.callGithub;
  const db = options.db;

  const util = require('util');

  apiv1.get('/', function(req, res) {
    res.send('Hello from APIv1 root route.');
  });
  
  function saveToDb(req, res, next) {
    if (res.err) {
      next();
      return;
    }
    db.connect();
  
    next();
  }
  
  apiv1.get('/search', callGithub.getRepos, function(req, res) {
    if (res.err) { 
      console.log(`apiv1.get : res.err = ${util.inspect(res.err, null, 4)}`);
      if (!res.err.statusCode) {
        res.err.statusCode = 500;
      }
      res.status(res.err.statusCode).send(res.err.message);
    } else {
      res.send(res.data);
    }
  });

  return apiv1
}

module.exports.apiv1 = apiv1;