import React, { Component } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import moment from "moment";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import ReactTable from "react-table";
import { Address4 } from "ip-address";
import { Checkbox, Button, Glyphicon, Nav, NavItem } from "react-bootstrap";
import QueueSelection, { QueueMenu } from "../components/QueueSelection";
import Timeframe from "../components/Timeframe";
import parse from "../utils/parse";
import ColumnPicker from "../components/ColumnPicker";
import update from "immutability-helper";
import SearchControl from "../components/SearchControl";
import momentDurationFormatSetup from "moment-duration-format";
import dateformat from "../utils/date-format";

import "../../node_modules/react-table/react-table.css";

momentDurationFormatSetup(moment);

function pct(n, d) {
  if (!d || !n)
    return 0;
  return (n/d) * 100;
}

const special = ['ses', 'mailgun', 'sparkpost', 'easylink', 'smtprelay'];

class IPReputation extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var start = moment().add(1, 'hour').subtract(1, 'days').minutes(0).seconds(0);
    var end = moment().add(2, 'days').hour(0).minutes(0).seconds(0);
    var search = '';
    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'domaingroup'},
      {id: 'ip'},
    ];

    if (p.tablestate) {
      var ts = JSON.parse(p.tablestate);
      start = moment(ts.start);
      end = moment(ts.end);
      search = ts.search;
      page = ts.page;
      pageSize = ts.pageSize;
      sorted = ts.sorted;
    } else if (p.start) {
      start = moment(p.start);
      end = moment(p.end);
    }

    this.state = {
      data: null,
      reloading: false,
      show: {},
      search: search,
      start: start,
      end: end,
      page: page,
      pageSize: pageSize,
      sorted: sorted,
    };

    props.setDataCB(this.setData);
    props.setLoadedCB(this.dataLoaded);

    this._saveConfig = _.debounce(this.saveConfig, 1000);
  }

  tableState = () => {
    return encodeURIComponent(JSON.stringify(_.pick(this.state, 'search', 'start', 'end', 'page', 'pageSize', 'sorted')));
  }

  onPageChange = index => {
    this.setState({page: index});
  }
  onPageSizeChange = (size, index) => {
    this.setState({pageSize: size, page: index});
  }
  onSortedChange = sort => {
    this.setState({sorted: sort});
  }

  showColumn(accessor) {
    if (_.isUndefined(this.state.show[accessor])) {
      return true;
    }
    return this.state.show[accessor];
  }

  setShow = (accessor, val) => {
    this.setState({show: update(this.state.show, {[accessor]: {$set: val}})});
    this._saveConfig();
  }

  setData = data => {
    this.setState({data: data});
  }

  dataLoaded = () => {
    if (this.props.tableconfig) {
      var p = {};
      _.each(this.props.tableconfig.show, (val, col) => {
        p[col] = {$set: val};
      });
      if (_.size(p)) {
        this.setState({show: update(this.state.show, p)});
      }
    }
  }

  saveConfig = () => {
    axios.patch('/api/tableconfigs/ipreputation', {show: this.state.show});
  }

  componentWillMount() {
    this.reload();
  }

  switchView = url => {
    url += '?start=' + dateformat(this.state.start) + '&end=' + dateformat(this.state.end);
    this.props.history.push(url);
  }

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  searchChanged = s => {
    this.setState({search: s});
  }

  async reload() {
    var {start, end} = this.state;

    this.setState({data: (await axios.get('/api/ipstats?start=' + dateformat(start) + '&end=' + dateformat(end))).data});
  }

  setDates = (start, end) => {
    this.setState({start: start, end: end}, () => this.refresh());
  }

  render() {
    let columns = [{
      Header: <Checkbox className="nomargin" checked={this.props.selectAll}
                        onClick={this.props.onHeaderCheckClick} onChange={this.props.onHeaderCheckChange.bind(null, this.state.data)} disabled={this.props.isSaving} />,
      accessor: '',
      Cell: ({...props}) => {
        return <Checkbox className="nomargin" id={props.original.id} checked={this.props.isSelected(props.original)}
                         onChange={this.props.onCheckChange} disabled={this.props.isSaving} />;
      },
      width: 35,
      mandatory: true,
    }, {
      Header: 'Domain',
      accessor: 'domaingroup',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
      mandatory: true,
    }, {
      Header: 'IP',
      accessor: 'ip',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
      sortMethod: (a, b) => {
        if (a.includes('pool') || b.includes('pool')) {
          return a.localeCompare(b);
        } else {
          let ip1 = new Address4(a).bigInteger();
          let ip2 = new Address4(b).bigInteger();

          if (ip1 === null || ip2 === null) {
            return a.localeCompare(b);
          }

          return ip1.compareTo(ip2);
        }
      },
      mandatory: true,
    }, {
      Header: 'Status',
      headerClassName: 'text-left',
      accessor: 'status',
      Cell: ({...props}) => {
        var o = props.original;
        if (special.find(s => s === o.sinkid)) {
          return <span className={props.original.txtcls}>None</span>;
        } else {
          return <Link to={'/servers/stats?id=' + o.sinkid + '&domaingroupid=' + o.domaingroupid + '&settingsid=' + o.settingsid +
                            '&ip=' + o.ip + '&returnto=ipreputation&tablestate=' + this.tableState()}>{props.value}</Link>
        }
      },
      mandatory: true,
    }, {
      Header: 'Sent',
      accessor: 'send_all',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toLocaleString()}</span>,
      className: 'text-right',
      mandatory: true,
    }, {
      Header: 'Send Limit',
      headerClassName: 'text-right',
      accessor: 'sendlimit',
      Cell: ({...props}) => {
        var o = props.original;
        if (props.value === null || special.find(s => s === o.sinkid)) {
          return <span className={props.original.txtcls}>None</span>;
        } else {
          return <Link to={'/servers/stats?id=' + o.sinkid + '&domaingroupid=' + o.domaingroupid + '&settingsid=' + o.settingsid +
                            '&ip=' + o.ip + '&returnto=ipreputation&tablestate=' + this.tableState()}>{props.value.toLocaleString()}</Link>
        }
      },
      className: 'text-right',
      show: this.showColumn('sendlimit'),
    }, {
      Header: 'Queue',
      headerClassName: 'text-right',
      accessor: 'queue',
      Cell: ({...props}) => {
          return <span className={props.original.txtcls}>{props.value.toLocaleString()}</span>;
      },
      className: 'text-right',
      show: this.showColumn('queue'),
    }, {
      Header: 'Complaints',
      accessor: 'complaint_pct',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
      mandatory: true,
    }, {
      Header: 'Opens',
      accessor: 'open_pct',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
      mandatory: true,
    }, {
      Header: 'Soft Bounces',
      accessor: 'soft_pct',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          var {start, end} = this.state;
          return <Link to={'/statmsgs?type=soft' +
                           '&returnto=' + encodeURIComponent('/ipreputation?tablestate=' + this.tableState()) +
                           '&start=' + dateformat(start) +
                           '&end=' + dateformat(end) +
                           '&domaingroupid=' + props.original.domaingroupid +
                           '&ip=' + props.original.ip +
                           '&settingsid=' + props.original.settingsid +
                           '&sinkid=' + props.original.sinkid
                           }>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
      show: this.showColumn('soft_pct'),
    }, {
      Header: 'Hard Bounces',
      accessor: 'hard_pct',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          var {start, end} = this.state;
          return <Link to={'/statmsgs?type=hard' +
                           '&returnto=' + encodeURIComponent('/ipreputation?tablestate=' + this.tableState()) +
                           '&start=' + dateformat(start) +
                           '&end=' + dateformat(end) +
                           '&domaingroupid=' + props.original.domaingroupid +
                           '&ip=' + props.original.ip +
                           '&settingsid=' + props.original.settingsid +
                           '&sinkid=' + props.original.sinkid
                           }>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
      show: this.showColumn('hard_pct'),
    }, {
      Header: 'Policy',
      accessor: 'settings',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
      show: this.showColumn('settings'),
    }, {
      Header: 'Server',
      accessor: 'sink',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
      show: this.showColumn('sink'),
    }];

    let data = _.filter(_.map(this.state.data, s => {
      var setting = _.find(this.props.settings, setting => setting.id === s.settingsid);
      if (!setting) {
        setting = _.find(this.props.mailgun, mg => mg.id === s.settingsid);
        if (!setting) {
          setting = _.find(this.props.ses, ses => ses.id === s.settingsid);
          if (!setting) {
            setting = _.find(this.props.sparkpost, sp => sp.id === s.settingsid);
            if (!setting) {
              setting = _.find(this.props.easylink, el => el.id === s.settingsid);
              if (!setting) {
                setting = _.find(this.props.smtprelays, sm => sm.id === s.settingsid);
              }
            }
          }
        }
      }
      var sink = _.find(this.props.sinks, sink => sink.id === s.sinkid);
      var status = 'Active';

      if (s.ispaused) {
        status = 'Paused';
        if (s.discard)
          status += ' (discarding)';
      } else if (s.deferlen) {
        var ts = moment(s.ts).add(s.deferlen, 'seconds');
        if (ts.isAfter(moment())) {
          status = 'Deferred ' + moment.duration(ts.diff(moment())).format('h[hr] m[m] s[s]');
        } else if (moment().diff(s.ts, 'minutes') >= 10) {
          status = 'Idle';
        }
      } else if (moment().diff(s.ts, 'minutes') >= 10) {
        status = 'Idle';
      }
      return {
        ...s,
        id: s.domaingroupid + ':' + s.ip + ':' + s.settingsid + ':' + s.sinkid,
        domaingroup: s.domaingroupid,
        status: status,
        send_all: s.send + s.soft + s.hard,
        complaint_pct: pct(s.complaint, s.send),
        open_pct: pct(s.open, s.send),
        soft_pct: pct(s.soft, s.send + s.soft + s.hard),
        hard_pct: pct(s.hard, s.send + s.soft + s.hard),
        settings: setting ? setting.name : '',
        sink: sink ? sink.name : s.sinkid,
        txtcls: s.ispaused ? (s.discard ? 'text-danger' : 'text-warning') : '',
      };
    }), s => {
      var search = this.state.search.toLowerCase();
      if (!search)
        return true;
        return (s.domaingroup || '').toLowerCase().includes(search) ||
               (s.ip || '').toLowerCase().includes(search) ||
               (s.status || '').toLowerCase().includes(search) ||
               (s.sink || '').toLowerCase().includes(search) ||
               (s.settings || '').toLowerCase().includes(search);
    });

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="IP Reputation Report" tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="2">
              <NavItem eventKey="1" onClick={this.switchView.bind(null, "/ipdelivery")}>Delivery</NavItem>
              <NavItem eventKey="2" disabled>Reputation</NavItem>
            </Nav>
          </EDTabs>
        } button={<Timeframe initialStart={this.state.start} initialEnd={this.state.end} onChange={this.setDates} />} />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
            {
              this.state.data !== null &&
                <div className="space20">
                  <div className="text-right">
                    <SearchControl onChange={this.searchChanged} value={this.state.search} />
                    <ColumnPicker style={{marginLeft:'10px', marginRight:'10px'}} columns={columns} setShow={this.setShow} />
                    <Button disabled={this.state.reloading} onClick={this.refresh}><Glyphicon className={this.state.reloading?'spinning':''} glyph="refresh"/></Button>
                  </div>
                  <QueueMenu {...this.props} data={data} />
                </div>
            }
            {
              this.state.data !== null &&
                (this.state.data.length ?
                  <ReactTable
                    data={data}
                    columns={columns}
                    minRows={0}
                    sorted={this.state.sorted}
                    page={this.state.page}
                    pageSize={this.state.pageSize}
                    onPageChange={this.onPageChange}
                    onPageSizeChange={this.onPageSizeChange}
                    onSortedChange={this.onSortedChange}
                  />
                  :
                  <div className="text-center space-top-sm">
                    <h4>No IP delivery data found!</h4>
                  </div>)
            }
            <div className="space30"/>
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: QueueSelection(IPReputation),
  initial: [],
  get: async () => [],
  extra: {
    settings: async () => (await axios.get('/api/policies')).data,
    sinks: async () => (await axios.get('/api/sinks')).data,
    mailgun: async () => (await axios.get('/api/mailgun')).data,
    ses: async () => (await axios.get('/api/ses')).data,
    sparkpost: async () => (await axios.get('/api/sparkpost')).data,
    easylink: async () => (await axios.get('/api/easylink')).data,
    smtprelays: async () => (await axios.get('/api/smtprelays')).data,
    tableconfig: async () => (await axios.get('/api/tableconfigs/ipreputation')).data,
  }
});
