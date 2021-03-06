require('./style/index.less');

const React = require('react');
const {Tab} = require('client/uskin/index');
const Chart = require('client/libs/charts/index');

const request = require('./request');
const __ = require('locale/client/admin.lang.json');
const router = require('client/utils/router');
const unitConverter = require('client/utils/unit_converter');
const utils = require('../../utils/utils');
const getCommonFactor = utils.getCommonFactor;

const tabs = [{
  name: __.host,
  key: 'host'
}, {
  name: __['host-overview'],
  key: 'host-overview',
  default: true
}];

const infoColor = '#42b9e5',
  info700Color = '#097fab',
  warningColor = '#f2994b',
  dangerColor = '#ff5a67',
  basicGrey = '#f2f3f4',
  basicBlack = '#252f3d',
  fontDark = '#939ba3',
  fontDarker = '#626b7e',
  gaugeTickColor = '#bbbfc5';

let settings = HALO.settings;

class Model extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      data: {},
      loading: true
    };
  }

  componentDidMount() {
    this.setChartCanvas();
    this.getOverview();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.style.display !== 'none' && this.props.style.display === 'none') {
      this.loading();
      this.getOverview();
    }
  }

  loading() {
    this.setState({
      loading: true
    });
  }

  setChartCanvas() {
    this.diskChart = new Chart.PieChart(document.getElementById('chart-disk-usage'));
    this.cpuChart = new Chart.BarChart(document.getElementById('chart-cpu-usage'));
    this.memoryChart = new Chart.GaugeChart(document.getElementById('chart-memory-usage'));
  }

  getOverview() {
    request.getOverview().then((res) => {
      let data = res.hypervisor_statistics;

      this.setState({
        data: data,
        loading: false
      }, () => {
        this.displayDisk(data);
        this.displayCPU(data);
        this.displayMemory(data);
      });
    });
  }

  getChartColor(rate) {
    if (rate <= 0.6) {
      return infoColor;
    } else if (rate <= 0.8) {
      return warningColor;
    } else {
      return dangerColor;
    }
  }

  getChartClass(rate) {
    if (rate <= 0.6) {
      return 'info';
    } else if (rate <= 0.8) {
      return 'warning';
    } else {
      return 'danger';
    }
  }

  displayDisk(data) {
    // nova bug: if storage is ceph, nova would duplicate the local_gb by multiplying the count!!!
    // when storage is commercial storage, nova can not get the storage size, we can only set it by setting
    let rate = data.local_gb_used / (settings.commercial_storage ? settings.commercial_storage : (data.local_gb / data.count));
    let rateColor = this.getChartColor(rate);

    this.diskChart.setOption({
      lineWidth: 8,
      bgColor: basicGrey,
      series: [{
        color: rateColor,
        data: rate
      }],
      text: {
        color: rateColor,
        fontSize: '22px'
      },
      period: 600
    });
  }

  displayCPU(data) {
    let sum = data.vcpus,
      used = data.vcpus_used,
      max = sum > used ? sum : used,
      period;

    if (max <= 20) {
      period = Math.ceil(max / 10);
    } else if (max <= 50) {
      period = 5;
    } else {
      period = Math.ceil(max / 100) * 10;
    }
    this.cpuChart.setOption({
      unit: '',
      title: '',
      xAxis: {
        tickWidth: 50,
        barWidth: 30
      },
      yAxis: {
        color: basicGrey,
        tickPeriod: period,
        tickColor: fontDark
      },
      series: [{
        color: info700Color,
        data: data.vcpus_used
      }, {
        color: infoColor,
        data: data.vcpus
      }],
      period: 600,
      easing: 'easeOutCubic'
    });
  }

  displayMemory(data) {
    let rate = data.memory_mb_used / data.memory_mb,
      rateColor = this.getChartColor(rate);

    this.memoryChart.setOption({
      lineWidth: 0.4,
      bgColor: basicGrey,
      tickColor: fontDarker,
      series: [{
        color: rateColor,
        data: rate
      }],
      tick: {
        tickWidth: 10,
        color: gaugeTickColor
      },
      pointer: {
        radius: 10,
        color: basicBlack
      },
      period: 600,
      easing: 'easeOutCubic'
    });
  }

  clickTabs(e, item) {
    let path = router.getPathList();
    router.pushState('/' + path[0] + '/' + item.key);
  }

  render() {
    let state = this.state,
      data = state.data,
      loading = state.loading;

    // nova bug: if storage is ceph, nova would duplicate the local_gb by multipying the count!!!, the commercial storage is normal
    let diskSum = settings.commercial_storage ? settings.commercial_storage : data.local_gb / data.count;
    let diskUsed = data.local_gb_used;
    let diskFree = diskSum - diskUsed;

    let disk = {
      sum: unitConverter(diskSum, 'GB'),
      used: unitConverter(diskUsed, 'GB'),
      free: unitConverter(diskFree, 'GB'),
      rateClass: this.getChartClass(diskUsed / diskSum)
    };
    let cpu = {
      sum: data.vcpus,
      used: data.vcpus_used,
      common: getCommonFactor(data.vcpus, data.vcpus_used)
    };
    let memory = {
      sum: unitConverter(data.memory_mb, 'MB'),
      used: unitConverter(data.memory_mb_used, 'MB'),
      free: unitConverter(data.memory_mb - data.memory_mb_used, 'MB'),
      rate: Math.round((data.memory_mb_used / data.memory_mb) * 100),
      rateClass: this.getChartClass(data.memory_mb_used / data.memory_mb)
    };
    let csum = cpu.sum / cpu.common;
    let cused = cpu.used / cpu.common;
    let numerator = csum / csum;
    let denominator = (cused / csum).toFixed(2);

    return (
      <div className="halo-module-host-overview" style={this.props.style}>
        <div className="submenu-tabs">
          <Tab items={tabs} onClick={this.clickTabs.bind(this)} />
        </div>
        <div className="charts">
          <div className="col col-6">
            <div className="block block-host">
              <div className="title">{__.host}</div>
              <div className="content">
                {loading ? <div className="loading-data"><i className="glyphicon icon-loading"></i></div> : null}
                <ul className={loading ? 'hidden' : null}>
                  <li>
                    <div className="number">{data.count}</div>
                    <div className="desc">{__.host + __.amount}</div>
                  </li>
                  <li>
                    <div className="number">{data.running_vms}</div>
                    <div className="desc">{__.instance + __.amount}</div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="block block-disk">
              <div className="title">{__.disk + __.usage}</div>
              <div className="content">
                {loading ? <div className="loading-data"><i className="glyphicon icon-loading"></i></div> : null}
                <div className={'chart-disk-usage' + (loading ? ' hidden' : '')} id="chart-disk-usage" />
                <div className={'description' + (loading ? ' hidden' : '')}>
                  <div className="total">
                    <strong>{disk.sum.num + disk.sum.unit}</strong>
                    <span>{__.storage + __.all_capacity}</span>
                  </div>
                  <div className="allocate-box">
                    <div className={'allocate allocate-' + disk.rateClass}>
                      {__.allocated + __.capacity}
                      <span>{disk.used.num}</span>{disk.used.unit}
                    </div>
                    <div className="allocate allocate-free">
                      {__.unallocated + __.capacity}
                      <span>{disk.free.num}</span>{disk.free.unit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col col-6">
            <div className="block block-cpu">
              <div className="title">{__.vcpu}</div>
              <div className="content">
                {loading ? <div className="loading-data"><i className="glyphicon icon-loading"></i></div> : null}
                <div className={'chart-cpu-usage' + (loading ? ' hidden' : '')} id="chart-cpu-usage" />
                <div className={'description' + (loading ? ' hidden' : '')}>
                  <div className="allocate-box">
                    <div className="allocate allocate-info-700">
                      {__.vcpu_used}<span>{cpu.used}</span>
                    </div>
                    <div className="allocate allocate-info">
                      {__.vcpu + __.amount}<span>{cpu.sum}</span>
                    </div>
                  </div>
                  <div className="reuse-rate">
                    {__.reuse + __.rate}
                    <span>{numerator + ' : ' + denominator}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="block block-memory">
              <div className="title">{__.memory}</div>
              <div className="content">
                {loading ? <div className="loading-data"><i className="glyphicon icon-loading"></i></div> : null}
                <div className={'chart-memory-usage' + (loading ? ' hidden' : '')} id="chart-memory-usage" />
                <div className={'description' + (loading ? ' hidden' : '')}>
                  <div className="allocate-box">
                    <div className={'allocate allocate-' + memory.rateClass}>
                      {__.allocated + __.memory}
                      <span>{memory.used.num}</span>{memory.used.unit}
                    </div>
                    <div className="allocate allocate-free">
                      {__.unallocated + __.memory}
                      <span>{memory.free.num}</span>{memory.free.unit}
                    </div>
                    <div className="allocate allocate-empty">
                      {__.total + __.memory}
                      <span>{memory.sum.num}</span>{memory.sum.unit}
                    </div>
                  </div>
                  <div className="reuse-rate">
                    {__.usage}<span>{memory.rate + '%'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

}

module.exports = Model;
