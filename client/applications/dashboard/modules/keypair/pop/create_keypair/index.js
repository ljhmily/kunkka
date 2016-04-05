var commonModal = require('client/components/modal_common/index');
var config = require('./config.json');
var request = require('../../request');

function pop(parent, callback) {
  var props = {
    parent: parent,
    config: config,
    onInitialize: function(refs) {},
    onConfirm: function(refs, cb) {
      var data;
      var name = refs.name.state.value;
      if (refs.type.state.value === 'create_keypair') {
        data = {
          name: name
        };
        request.createKeypair(data).then((res) => {
          var container = document.getElementById('modal-container').getElementsByClassName('modal')[0];
          var linkNode = document.createElement('a');
          if (linkNode.download !== undefined) {
            linkNode.download = res.name + '.pem';
          }
          linkNode.href = 'data:application/x-pem-file,' + encodeURIComponent(res.private_key);
          container.appendChild(linkNode);
          linkNode.click();
          callback && callback(res);
          cb(true);
        });
      } else {
        data = {
          name: name,
          public_key: refs.public_key.state.value
        };
        request.createKeypair(data).then((res) => {
          callback && callback(res);
          cb(true);
        }).catch(function() {
          cb(false);
        });
      }
    },
    onAction: function(filed, state, refs) {
      switch (filed) {
        case 'type':
          refs.public_key.setState({
            hide: state.value === 'create_keypair'
          });
          break;
        default:
          break;
      }
    }
  };

  commonModal(props);
}

module.exports = pop;