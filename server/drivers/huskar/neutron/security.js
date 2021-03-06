'use strict';

const Base = require('../base.js');
const driver = new Base();

driver.listSecurity = function (projectId, token, remote, callback, query) {
  return driver.getMethod(
    remote + '/v2.0/security-groups',
    token,
    callback,
    query
  );
};
driver.showSecurityDetails = function (projectId, securityId, token, remote, callback, query) {
  return driver.getMethod(
    remote + '/v2.0/security-groups/' + securityId,
    token,
    callback,
    query
  );
};
driver.createSecurityGroupRule = function (theBody, token, remote, callback) {
  return driver.postMethod(
    remote + '/v2.0/security-group-rules',
    token,
    callback,
    theBody
  );
};

/*** Promise ***/


driver.listSecurityAsync = function (projectId, token, remote, query) {
  return driver.getMethodAsync(
    remote + '/v2.0/security-groups',
    token,
    query
  );
};
driver.showSecurityDetailsAsync = function (projectId, securityId, token, remote, query) {
  return driver.getMethodAsync(
    remote + '/v2.0/security-groups/' + securityId,
    token,
    query
  );
};
driver.createSecurityGroupRuleAsync = function (theBody, token, remote) {
  return driver.postMethodAsync(
    remote + '/v2.0/security-group-rules',
    token,
    theBody
  );
};

module.exports = driver;
