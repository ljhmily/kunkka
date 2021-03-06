require('./style/index.less');

const React = require('react');
const Main = require('client/components/main_paged/index');
const BasicProps = require('client/components/basic_props/index');

const allocateModal = require('./pop/allocation_floating_ip/index');
const dissociateModal = require('./pop/dissociate_floating_ip/index');

const request = require('./request');
const config = require('./config.json');
const moment = require('client/libs/moment');
const __ = require('locale/client/admin.lang.json');
const getStatusIcon = require('../../utils/status_icon');
const utils = require('../../utils/utils');
const csv = require('./pop/csv/index');

class Model extends React.Component {

  constructor(props) {
    super(props);

    moment.locale(HALO.configs.lang);

    this.state = {
      config: config
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });

    this.stores = {
      urls: [],
      enableRatelimit: HALO.settings.enable_floatingip_bandwidth ? true : false
    };
  }

  componentWillMount() {
    let a = '', b = '';

    this.state.config.table.column.forEach((col) => {
      if (col.key === 'floating_ip') {
        col.sortBy = function(item1, item2) {
          a = item1.floating_ip_address;
          b = item2.floating_ip_address;
          return utils.ipFormat(a) - utils.ipFormat(b);
        };
      } else if (col.key === 'ip_address') {
        col.sortBy = function(item1, item2) {
          a = item1.fixed_ip_address || '';
          b = item2.fixed_ip_address || '';
          return utils.ipFormat(a) - utils.ipFormat(b);
        };
      }
    });
    this.tableColRender(this.state.config.table.column);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if(nextProps.style.display === 'none' && this.props.style.display === 'none') {
      return false;
    }
    return true;
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.style.display !== 'none' && this.props.style.display === 'none') {
      this.loadingTable();
      this.onInitialize(nextProps.params);
    }
  }

  tableColRender(columns) {
    columns.map((column) => {
      switch(column.key) {
        case 'bandwidth':
          column.render = (col, item) => {
            let rateLimit = Number(item.fipratelimit / 1024);
            return isNaN(rateLimit) ? __.unlimited : (rateLimit + ' Mbps');
          };
          break;
        default:
          break;
      }
    });
  }

  onInitialize(params) {
    this.loadingTable();
    if(params && params[2]) {
      this.getSingle(params[2]);
    } else {
      this.getList();
    }
  }

  getInitializeListData() {
    this.getList();
  }

  getSingle(id) {
    this.clearState();
    let table = this.state.config.table;

    request.getFloatingIPByID(id, this.stores.enableRatelimit).then((res) => {
      if (res.floatingip) {
        table.data = [res.floatingip];
      } else {
        table.data = [];
      }
      this.setPagination(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      this.setPagination(table, res);
      this.updateTableData(table, res._url);
    });
  }

  getList() {
    this.clearState();
    let table = this.state.config.table;
    let pageLimit = localStorage.getItem('page_limit');

    request.getList(pageLimit, this.stores.enableRatelimit).then((res) => {
      table.data = res.floatingips;
      this.setPagination(table, res);
      this.updateTableData(table, res._url);
    }).catch((res) => {
      table.data = [];
      this.setPagination(table, res);
      this.updateTableData(table, res._url);
    });
  }

  getNextListData(url, refreshDetail) {
    let table = this.state.config.table;
    request.getNextList(url, this.stores.enableRatelimit).then((res) => {
      if(res.floatingip) {
        table.data = [res.floatingip];
      } else if(res.floatingips) {
        table.data = res.floatingips;
      } else {
        table.data = [];
      }

      this.setPagination(table, res);
      this.updateTableData(table, res._url, refreshDetail);
    }).catch((res) => {
      table.data = [];
      this.setPagination(table, res);
      this.updateTableData(table, res._url);
    });
  }

  updateTableData(table, currentUrl, refreshDetail) {
    let newConfig = this.state.config;
    newConfig.table = table;
    newConfig.table.loading = false;

    this.setState({
      config: newConfig
    }, () => {
      this.stores.urls.push(currentUrl.split('/v2.0/')[1]);
      let detail = this.refs.dashboard.refs.detail,
        params = this.props.params;
      if(detail && refreshDetail && params.length > 2) {
        detail.refresh();
      }
    });
  }

  setPagination(table, res) {
    let pagination = {},
      next = res.floatingips_links ? res.floatingips_links[0] : null;

    if(next && next.rel === 'next') {
      pagination.nextUrl = next.href.split('/v2.0/')[1];
    }

    let history = this.stores.urls;

    if(history.length > 0) {
      pagination.prevUrl = history[history.length - 1];
    }
    table.pagination = pagination;

    return table;
  }

  refresh(data, params) {
    if(!data) {
      data = {};
    }
    if(!params) {
      params = this.props.params;
    }

    if(data.initialList) {
      if(data.loadingTable) {
        this.loadingTable();
      }
      if(data.clearState) {
        this.clearState();
      }

      this.getInitializeListData();
    } else if(data.refreshList) {
      if(params[2]) {
        if(data.loadingDetail) {
          this.loadingDetail();
          this.refs.dashboard.setRefreshBtnDisabled(true);
        }
      } else {
        if(data.loadingTable) {
          this.loadingTable();
        }
      }

      let history = this.stores.urls,
        url = history.pop();

      this.getNextListData(url, data.refreshDetail);
    }
  }

  loadingTable() {
    let _config = this.state.config;
    _config.table.loading = true;

    this.setState({
      config: _config
    });
  }

  loadingDetail() {
    this.refs.dashboard.refs.detail.loading();
  }

  clearUrls() {
    this.stores.urls = [];
  }

  clearState() {
    this.clearUrls();

    let dashboard = this.refs.dashboard;
    if (dashboard) {
      dashboard.clearState();
    }
  }

  onAction(field, actionType, refs, data) {
    switch(field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'search':
        this.onClickSearch(actionType, refs, data);
        break;
      case 'table':
        this.onClickTable(actionType, refs, data);
        break;
      case 'detail':
        let item = data.rows[0];
        this.loadingDetail();
        if(item.router_id || item.port_id) {
          request.getRelatedSourcesById(item).then(() => {
            this.onClickDetailTabs(actionType, refs, data);
          });
        } else {
          this.onClickDetailTabs(actionType, refs, data);
        }
        break;
      case 'page_limit':
        this.onInitialize();
        break;
      default:
        break;
    }
  }

  onClickSearch(actionType, refs, data) {
    if (actionType === 'click') {
      this.loadingTable();
      if (data.text) {
        this.getSingle(data.text);
      } else {
        this.getList();
      }
    }
  }

  onClickDetailTabs(tabKey, refs, data) {
    let {rows} = data;
    let detail = refs.detail;
    let contents = detail.state.contents;

    switch(tabKey) {
      case 'description':
        if(rows.length === 1) {
          let basicPropsItem = this.getBasicPropsItems(rows[0]);

          contents[tabKey] = (
            <div>
              <BasicProps
                title={__.basic + __.properties}
                defaultUnfold={true}
                tabKey={'description'}
                items={basicPropsItem}
                rawItem={rows[0]}
                onAction={this.onDetailAction.bind(this)}
                dashboard={this.refs.dashboard ? this.refs.dashboard : null} />
            </div>
          );
        }
        break;
      default:
        break;
    }

    detail.setState({
      contents: contents,
      loading: false
    });
  }

  getBasicPropsItems(item) {
    let items = [{
      title: __.floating_ip + __.address,
      type: 'copy',
      content: item.floating_ip_address
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.ip + __.address,
      content: item.fixed_ip_address ?
        item.fixed_ip_address : '-'
    }, {
      title: __.bandwidth,
      content: isNaN((item.fipratelimit / 1024)) ? __.unlimited : (item.fipratelimit / 1024 + ' Mbps')
    }, {
      title: __.related + __.instance,
      content: item.server_id ?
        <span>
          <i className="glyphicon icon-instance" />
          <a data-type="router" href={'/admin/instance/' + item.server_id}>
            {item.server_name || '(' + item.server_id.substr(0, 8) + ')'}
          </a>
        </span> : '-'
    }, {
      title: __.related + __.router,
      content: item.router_id ?
        <span>
          <i className="glyphicon icon-router" />
          <span>{item.router_name || '(' + item.router_id.substr(0, 8) + ')'}</span>
        </span> : '-'
    }, {
      title: __.status,
      type: 'status',
      content: getStatusIcon(item.status)
    }, {
      title: __.project + __.id,
      type: 'copy',
      content: item.tenant_id
    }];

    return items;
  }

  onDetailAction(tabKey, actionType, data) {
    switch(tabKey) {
      case 'description':
        this.onDescriptionAction(actionType, data);
        break;
      default:
        break;
    }
  }

  onDescriptionAction(actionType, data) {
    switch(actionType) {
      default:
        break;
    }
  }

  onClickTable(actionType, refs, data) {
    switch(actionType) {
      case 'check':
        this.onClickTableCheckbox(refs, data);
        break;
      case 'pagination':
        let url,
          history = this.stores.urls;

        if (data.direction === 'prev') {
          history.pop();
          if (history.length > 0) {
            url = history.pop();
          }
        } else if (data.direction === 'next') {
          url = data.url;
        } else { //default
          url = this.stores.urls[0];
          this.clearState();
        }

        this.loadingTable();
        this.getNextListData(url);
        break;
      case 'filtrate':
        delete data.rows;
        this.clearState();

        let table = this.state.config.table;
        request.getFilterList(data, this.stores.enableRatelimit).then((res) => {
          table.data = res.floatingips;
          this.setPagination(table, res);
          this.updateTableData(table, res._url);
        }).catch((res) => {
          table.data = [];
          this.setPagination(table, res);
          this.updateTableData(table, res._url);
        });
        this.loadingTable();
        break;
      default:
        break;
    }
  }

  onClickBtnList(actionType, refs, data) {
    let rows = data.rows;

    switch(actionType) {
      case 'allocate':
        allocateModal(null, () => {
          this.refresh({
            refreshList: true
          });
        });
        break;
      case 'dissociate':
        request.getRelatedSourcesById(rows[0]).then(() => {
          dissociateModal(rows[0], null, () => {
            this.refresh({
              refreshList: true,
              refreshDetail: true
            });
          });
        });
        break;
      case 'export_csv':
        request.getFieldsList().then((res) => {
          csv(res);
        });
        break;
      case 'refresh':
        this.refresh({
          refreshList: true,
          refreshDetail: true,
          loadingTable: true,
          loadingDetail: true
        });
        break;
      default:
        break;
    }
  }

  onClickTableCheckbox(refs, data) {
    let {rows} = data,
      btnList = refs.btnList,
      btns = btnList.state.btns;

    btnList.setState({
      btns: this.btnListRender(rows, btns)
    });
  }

  btnListRender(rows, btns) {
    for(let key in btns) {
      switch(key) {
        case 'dissociate':
          btns[key].disabled = (rows.length === 1 && rows[0].router_id && rows[0].port_id) ? false : true;
          break;
        case 'export_csv':
          btns[key].disabled = false;
          break;
        default:
          break;
      }
    }

    return btns;
  }

  render() {
    return (
      <div className="halo-module-floating-ip" style={this.props.style}>
        <Main
          ref="dashboard"
          visible={this.props.style.display === 'none' ? false : true}
          onInitialize={this.onInitialize}
          onAction={this.onAction}
          __={__}
          config={this.state.config}
          params={this.props.params}
          getStatusIcon={getStatusIcon}
        />
      </div>
    );
  }

}

module.exports = Model;
