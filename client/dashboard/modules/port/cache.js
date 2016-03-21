var fetch = require('client/dashboard/cores/fetch');

module.exports = {
  getPortList: function() {
    return fetch.get({
      url: '/api/v1/' + HALO.user.projectId + '/ports'
    }).then(function(data) {
      return data.ports;
    });
  }
};
