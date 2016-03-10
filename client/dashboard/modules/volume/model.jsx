require('./style/index.less');

var React = require('react');
var Main = require('client/components/main/index');
var {Button} = require('client/uskin/index');

var BasicProps = require('client/components/basic_props/index');
var RelatedSnapshot = require('client/components/related_snapshot/index');

var deleteModal = require('client/components/modal_delete/index');
var createModal = require('./pop/create/index');

var config = require('./config.json');
var __ = require('i18n/client/lang.json');
var moment = require('client/libs/moment');
var request = require('./request');
var router = require('client/dashboard/cores/router');
var attachInstance = require('./pop/attach_instance/index');
var createSnapshot = require('./pop/create_snapshot/index');
var detachInstance = require('./pop/detach_instance/index');
var setRead = require('./pop/set_read/index');
var setReadWrite = require('./pop/set_read_write/index');
var resizeVolume = require('./pop/resize/index');

class Model extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      config: config
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });
  }

  componentWillMount() {
    this.tableColRender(this.state.config.table.column);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.style.display === 'none' && this.props.style.display === 'none') {
      return false;
    }
    return true;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.style.display !== 'none') {
      this.getTableData(false);
    }
  }

  tableColRender(columns) {
    columns.map((column) => {
      switch (column.key) {
        case 'size':
          column.render = (col, item, i) => {
            return item.size + ' GB';
          };
          break;
        case 'attch_instance':
          column.render = (col, item, i) => {
            var servers = [];

            item.attachments && item.attachments.map((attch, index) => {
              if (index > 0) {
                servers.push(<span key={'comma' + index}> ,</span>);
              }
              servers.push(
                <span key={index}>
                  <i className="glyphicon icon-instance" />
                  <a data-type="router" href={'/project/instance/' + attch.server.id}>
                    {attch.server.name}
                  </a>
                </span>
              );
            });
            return servers;
          };
          break;
        case 'type':
          column.render = (col, item, i) => {
            return <span><i className="glyphicon icon-performance" />{item.volume_type}</span>;
          };
          break;
        case 'shared':
          column.render = (col, item, i) => {
            return item.multiattach ? __.shared : '-';
          };
          break;
        case 'attributes':
          column.render = (col, item, i) => {
            return item.metadata.readonly ? __.read_write : __.read_only;
          };
          break;
        default:
          break;
      }
    });
  }

  onInitialize(params) {
    this.getTableData(false);
  }

  getTableData(forceUpdate, detailRefresh) {
    request.getList((res) => {
      var table = this.state.config.table;
      table.data = res;
      table.loading = false;

      var detail = this.refs.dashboard.refs.detail;
      if (detail && detail.state.loading) {
        detail.setState({
          loading: false
        });
      }

      this.setState({
        config: config
      }, () => {
        if (detail && detailRefresh) {
          detail.refresh();
        }
      });
    }, forceUpdate);
  }

  onAction(field, actionType, refs, data) {
    switch (field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'table':
        this.onClickTable(actionType, refs, data);
        break;
      case 'detail':
        this.onClickDetailTabs(actionType, refs, data);
        break;
      default:
        break;
    }
  }

  onClickBtnList(key, refs, data) {
    var rows = data.rows;
    switch (key) {
      case 'create':
        createModal(function(){});
        break;
      case 'delete':
        deleteModal({
          action: 'delete',
          type: 'volume',
          data: rows,
          onDelete: function(_data, cb) {
            cb(true);
          }
        });
        break;
      case 'create_snapshot':
        createSnapshot(rows[0], function(){});
        break;
      case 'attach_to_instance':
        attachInstance(rows[0], function() {});
        break;
      case 'dtch_volume':
        detachInstance(rows[0], function() {});
        break;
      case 'set_rd_only':
        setRead(rows[0], function() {});
        break;
      case 'set_rd_wrt':
        setReadWrite(rows[0], function() {});
        break;
      case 'refresh':
        this.refresh({
          tableLoading: true,
          detailLoading: true,
          clearState: true,
          detailRefresh: true
        }, true);
        break;
      case 'extd_capacity':
        resizeVolume(rows[0], function() {});
        break;
      default:
        break;
    }
  }

  onClickTable(actionType, refs, data) {
    switch (actionType) {
      case 'check':
        this.onClickTableCheckbox(refs, data);
        break;
      default:
        break;
    }
  }

  onClickTableCheckbox(refs, data) {
    var {rows} = data,
      btnList = refs.btnList,
      btns = btnList.state.btns;

    btnList.setState({
      btns: this.btnListRender(rows, btns)
    });
  }

  btnListRender(rows, btns) {
    for(let key in btns) {
      switch (key) {
        case 'create_snapshot':
          btns[key].disabled = (rows.length === 1) ? false : true;
          break;
        case 'attach_to_instance':
          btns[key].disabled = (rows.length === 1 && !rows[0].volume_image_metadata.instance_uuid) ? false : true;
          break;
        case 'dtch_volume':
          btns[key].disabled = (rows.length === 1 && rows[0].volume_image_metadata.instance_uuid) ? false : true;
          break;
        case 'extd_capacity':
          btns[key].disabled = (rows.length === 1 && rows[0].status === 'available') ? false : true;
          break;
        case 'set_rd_only':
          if(rows.length === 1 && rows[0].status === 'available') {
            btns[key].disabled = rows[0].metadata.readonly ? false : true;
          } else {
            btns[key].disabled = true;
          }
          break;
        case 'set_rd_wrt':
          if(rows.length === 1 && rows[0].status === 'available') {
            btns[key].disabled = !rows[0].metadata.readonly ? false : true;
          } else {
            btns[key].disabled = true;
          }
          break;
        case 'delete':
          btns[key].disabled = (rows.length > 0) ? false : true;
          break;
        default:
          break;
      }
    }

    return btns;
  }

  onClickDetailTabs(tabKey, refs, data) {
    var {rows} = data;
    var detail = refs.detail;
    var contents = detail.state.contents;
    var syncUpdate = true;

    var isAvailableView = (_rows) => {
      if (_rows.length > 1) {
        contents[tabKey] = (
          <div className="no-data-desc">
            <p>{__.view_is_unavailable}</p>
          </div>
        );
        return false;
      } else {
        return true;
      }
    };

    switch(tabKey) {
      case 'description':
        if (isAvailableView(rows)) {
          var basicPropsItem = this.getBasicProps(rows[0]),
            relatedSnapshotItems = this.getRelatedSnapshotItems(rows[0].snapshots);
          contents[tabKey] = (
            <div>
              <BasicProps title={__.basic + __.properties}
                defaultUnfold={true}
                items={basicPropsItem ? basicPropsItem : []}/>
              <RelatedSnapshot
                title={__.snapshot}
                defaultUnfold={true}
                noItemAlert={__.no_related + __.snapshot}
                items={relatedSnapshotItems ? relatedSnapshotItems : []}>
                <Button value={__.create + __.snapshot}/>
              </RelatedSnapshot>
            </div>
          );
        }
        break;
      default:
        break;
    }

    if (syncUpdate) {
      detail.setState({
        contents: contents
      });
    }
  }

  getBasicProps(item) {
    var getAttachments = (_item) => {
      var servers = [];

      _item.attachments && _item.attachments.map((attch, index) => {
        if (index > 0) {
          servers.push(<span key={'comma' + index}> ,</span>);
        }
        servers.push(
          <span key={index}>
            <i className="glyphicon icon-instance" />
            <a data-type="router" href={'/project/instance/' + attch.server.id}>
              {attch.server.name}
            </a>
          </span>
        );
      });
      return servers;
    };

    var data = [{
      title: __.name,
      content: item.name
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.size,
      content: item.size + ' GB'
    }, {
      title: __.type,
      content: item.volume_type
    }, {
      title: __.attach_to + __.instance,
      content: getAttachments(item)
    }, {
      title: __.shared,
      content: item.multiattach ? __.yes : __.no
    }, {
      title: __.attributes,
      content: item.metadata.readonly ? __.read_only : __.read_write
    }, {
      title: __.status,
      type: 'status',
      status: item.status,
      content: __[item.status.toLowerCase()]
    }, {
      title: __.create + __.time,
      type: 'time',
      content: item.created_at
    }];

    return data;
  }

  getRelatedSnapshotItems(items) {
    var data = [];
    items.forEach((item) => {
      data.push({
        title: moment(item.created_at).fromNow(),
        name:
          <span>
            <i className="glyphicon icon-snapshot" />
            <a data-type="router" href={'/project/snapshot/' + item.id}>{item.name}</a>
          </span>,
        size: item.size + 'GB',
        time: moment(item.created_at).format('YYYY-MM-DD HH:mm:ss'),
        status: item.status,
        createIcon: 'volume'
      });
    });

    return data;
  }

  refresh(data, forceUpdate) {
    if (data) {
      var path = router.getPathList();
      if (path[2]) {
        if (data.detailLoading) {
          this.refs.dashboard.refs.detail.loading();
        }
      } else {
        if (data.tableLoading) {
          this.loadingTable();
        }
        if (data.clearState) {
          this.refs.dashboard.clearState();
        }
      }
    }

    this.getTableData(forceUpdate, data ? data.detailRefresh : false);
  }

  loadingTable() {
    var _config = this.state.config;
    _config.table.loading = true;

    this.setState({
      config: _config
    });
  }

  render() {
    return (
      <div className="halo-module-volume" style={this.props.style}>
        <Main
          ref="dashboard"
          visible={this.props.style.display === 'none' ? false : true}
          onInitialize={this.onInitialize}
          onAction={this.onAction}
          onClickDetailTabs={this.onClickDetailTabs.bind(this)}
          config={this.state.config}
          params={this.props.params} />
      </div>
    );
  }

}

module.exports = Model;
