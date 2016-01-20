require('./style/index.less');

var React = require('react');

var lang = require('i18n/client/lang.json');
var converter = require('./converter');

var uskin = require('client/uskin/index');
var Table = uskin.Table;
var Button = uskin.Button;
var DropdownButton = uskin.DropdownButton;
var InputSearch = uskin.InputSearch;

var moment = require('client/libs/moment');

class MainTable extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      btns: [],
      tableData: []
    };

    moment.locale(HALO.configs.lang);
  }

  componentWillMount() {
    var config = this.props.config;
    converter.convertLang(lang, config);
    this.tableColRender(config.table.column);
  }

  getStatusIcon(data) {
    switch (data) {
      case 'active':
        return <i className="glyphicon icon-status-active active" />;
      case 'in-use':
        return <i className="glyphicon icon-status-light active" />;
      default:
        return undefined;
    }
  }

  tableColRender(column, item, index) {
    column.map((col) => {
      switch (col.type) {
        case 'captain':
          !col.render && (col.render = (rcol, ritem, rindex) => {
            var listener = (_item, _col, _index, e) => {
              e.preventDefault();
              console.log('print ' + _item.name, _item);
            };
            return <a style={{cursor: 'pointer'}} onClick={listener.bind(null, ritem, rcol, rindex)}>{ritem[rcol.dataIndex]}</a>;
          });
          break;
        case 'status':
          !col.render && (col.render = (rcol, ritem, rindex) => {
            var data = ritem[rcol.dataIndex].toLowerCase();
            var icon = this.getStatusIcon(data);
            return icon ? <div>{icon}{lang[data]}</div> : lang[data];
          });
          break;
        case 'time':
          !col.render && (col.render = (rcol, ritem, rindex) => {
            return moment(ritem[rcol.dataIndex]).fromNow();
          });
          break;
        default:
          break;
      }
    });
  }

  clearTableState() {
    this.refs.table.clearState();
  }

  render() {
    var props = this.props,
      config = props.config,
      eventList = props.eventList,
      btns = config.btns,
      search = config.search,
      table = config.table;

    return (
      <div className="halo-main-table">
        <div className="header">
          <h3>{config.title}</h3>
        </div>
        <div className="operation-list">
          {btns.map((btn, index) =>
            !btn.dropdown ?
            <Button
              key={index}
              value={btn.value}
              btnKey={btn.key}
              onClick={eventList.btnsOnClick}
              type={btn.type}
              disabled={btn.disabled}
              iconClass={btn.icon}
              initial={true} />
           : <DropdownButton
              key={index}
              disabled={btn.dropdown.disabled}
              buttonData={btn}
              dropdownItems={btn.dropdown.items}
              dropdownOnClick={eventList.dropdownBtnOnClick} />
          )}
          {config.search ?
            <InputSearch
              type={search.type}
              width={search.width}
              onChange={eventList.searchOnChange} />
            : null
          }
        </div>
        <Table
          ref="table"
          column={table.column}
          data={table.data}
          dataKey={table.dataKey}
          checkbox={table.checkbox}
          checkboxOnChange={eventList.tableCheckboxOnClick}
          hover={table.hover}
          striped={this.striped} />
      </div>
    );
  }

}

module.exports = MainTable;
