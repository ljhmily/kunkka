var storage = require('client/dashboard/cores/storage');
var fetch = require('client/dashboard/cores/fetch');
var RSVP = require('rsvp');

module.exports = {
  getList: function(forced) {
    return storage.getList(['router', 'network', 'subnet'], forced).then(function(data) {
      return data.router;
    });
  },
  editRouterName: function(item, newName) {
    var data = {};
    data.router = {};
    data.router.name = newName;

    return fetch.put({
      url: '/proxy/neutron/v2.0/routers/' + item.id,
      data: data
    });
  },
  deleteRouters: function(items) {
    var deferredList = [];
    items.forEach((item) => {
      deferredList.push(fetch.delete({
        url: '/proxy/neutron/v2.0/routers/' + item.id
      }));
    });
    return RSVP.all(deferredList);
  },
  createRouter: function(data) {
    return fetch.post({
      url: '/proxy/neutron/v2.0/routers',
      data: {
        router: data
      }
    });
  },
  updateRouter: function(routerId, data) {
    return fetch.put({
      url: '/proxy/neutron/v2.0/routers/' + routerId,
      data: {
        router: data
      }
    });
  },
  addInterface: function(routerId, data) {
    return fetch.put({
      url: '/proxy/neutron/v2.0/routers/' + routerId + '/add_router_interface',
      data: data
    });
  },
  changeFip: function(routerId, fipId) {
    return fetch.put({
      url: '/proxy/neutron/v2.0/floatingips/' + fipId,
      data: {
        floatingip: {
          port_id: routerId
        }
      }
    });
  },
  getGateway: function() {
    return storage.getList(['network']).then(function(data) {
      var ret;
      data.network.some((item) => {
        if (item['router:external']) {
          ret = item.id;
          return true;
        }
        return false;
      });
      return ret;
    });
  },
  getSubnets: function() {
    return storage.getList(['subnet']).then(function(data) {
      return data.subnet;
    });
  },
  detachSubnet: function(item) {
    var data = {};
    data.subnet_id = item.childItem.id;

    return fetch.put({
      url: '/proxy/neutron/v2.0/routers/' + item.rawItem.id + '/remove_router_interface',
      data: data
    });
  }
};
