import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import { Modal, FormControl, Checkbox, Button, MenuItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import Timeframe from "../components/Timeframe";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection } from "../components/EDDOM";
import ConfirmDropdown from "../components/ConfirmDropdown";
import ReactTable from "react-table";
import parse from "../utils/parse";
import moment from "moment";
import getvalue from "../utils/getvalue";
import update from "immutability-helper";
import dateformat from "../utils/date-format";
import EDDataSheet from "../components/EDDataSheet";
import { FormControlLabel } from "../components/FormControls";

import "../../node_modules/react-table/react-table.css";

import "./Customers.css";

function pct(n) {
  return (n * 100).toFixed(2) + '%';
}

class Customers extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var start = moment().subtract(1, 'days').minutes(0).seconds(0);
    var end = moment().add(2, 'days').hour(0).minutes(0).seconds(0);
    var search = '';
    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'created', desc: true},
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
      search: search,
      start: start,
      end: end,
      page: page,
      pageSize: pageSize,
      sorted: sorted,
      selected: {},
      selectAll: false,
      filter: 'all',
      showEditModal: false,
      limits: null,
      showConfirmModal: false,
      showApproveText: false,
      approveText: '',
      placeholder: 'Your account has been approved for its free trial. Thank you for trying us out!',
      confirmAction: null,
      confirmCB: null,
    };
  }

  componentWillMount() {
    this.reload();
  }

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  async reload() {
    var {start, end} = this.state;
    this.setState({data: (await axios.get('/api/companies?start=' + dateformat(start) + '&end=' + dateformat(end))).data});
  }

  setDates = (start, end) => {
    this.setState({start: start, end: end}, () => this.refresh());
  }

  searchChanged = s => {
    this.setState({search: s});
  }

  handleChange = event => {
    this.setState({[event.target.id]: getvalue(event)});
  }

  onHeaderCheckClick = e => {
    e.stopPropagation();
  }

  menuDisabled = multi => {
    if (multi) {
      return _.filter(_.values(this.state.selected), s => s).length === 0;
    } else {
      return _.filter(_.values(this.state.selected), s => s).length !== 1;
    }
  }

  onHeaderCheckChange = e => {
    var val = getvalue(e);
    var p = {selectAll: val, selected: {}};
    if (val) {
      _.each(this.filteredData(), s => {
        p.selected[s.id] = true;
      });
    }
    this.setState(p);
  }

  isSelected = s => {
    return this.state.selected[s.id] || false;
  }

  onCheckChange = e => {
    var val = getvalue(e);
    var p = {};
    if (this.state.selectAll) {
      p.selectAll = false;
      val = false;
    }
    p.selected = update(this.state.selected, {[e.target.id]: {$set: val}});
    this.setState(p);
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

  createClicked = () => {
    this.props.history.push("/customers/edit?id=new"); 
  }

  deleteConfirmClicked = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.filter(this.state.data, s => this.state.selected[s.id]);
      await axios.delete('/api/companies/' + s[0].id);
      await this.reload();
    } finally {
      this.setState({isSaving: false, selected: {}, selectAll: false});
    }
  }

  confirmClicked = ok => {
    if (!ok) {
      this.setState({showConfirmModal: false});
      return;
    } else {
      this.setState({showConfirmModal: false}, this.state.confirmCB);
    }
  }

  approve = () => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: true, confirmAction: 'approve ' + n, confirmCB: this.approveConfirm});
  }

  approveConfirm = async () => {
    this.setState({isSaving: true});

    var txt = this.state.approveText || this.state.placeholder;

    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/approvecompanies', {
        ids: s,
        comment: txt,
      });
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  ban = () => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: false, confirmAction: 'ban ' + n, confirmCB: this.banConfirm});
  }

  banConfirm = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/bancompanies', s);
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  unban = () => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: false, confirmAction: 'unban ' + n, confirmCB: this.unbanConfirm});
  }

  unbanConfirm = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/unbancompanies', s);
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  pause = () => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: false, confirmAction: 'pause sending for ' + n, confirmCB: this.pauseConfirm});
  }

  pauseConfirm = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/pausecompanies', s);
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  unpause = () => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: false, confirmAction: 'unpause sending for ' + n, confirmCB: this.unpauseConfirm});
  }

  unpauseConfirm = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/unpausecompanies', s);
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  purge = t => {
    var d = _.filter(this.state.data, s => this.state.selected[s.id]);
    var n;
    if (d.length > 1) {
      n = 'these customers';
    } else {
      n = d[0].name;
    }
    this.setState({showConfirmModal: true, showApproveText: false, confirmAction: 'purge ' + n, confirmCB: this.purgeConfirm.bind(null, t)});
  }

  purgeConfirm = async t => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/purgequeues/' + t, s);
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  edit = () => {
    var s = _.filter(this.state.data, s => this.state.selected[s.id]);
    this.props.history.push('/customers/edit?id=' + s[0].id);
  }

  impersonate = () => {
    var s = _.filter(this.state.data, s => this.state.selected[s.id]);
    this.props.setImpersonate(s[0].id);
  }

  deletePrompt = () => {
    var s = _.filter(this.state.data, s => this.state.selected[s.id]);
    if (!s.length) {
      return '';
    }
    return `Are you sure you wish to delete '${s[0].name}'?`;
  }

  probation(c) {
    return (c.paid && !c.banned &&
            c.hourlimit !== null && !_.isUndefined(c.hourlimit) &&
            c.daylimit !== null && !_.isUndefined(c.daylimit) &&
            c.daylimit <= c.defaultdaylimit && c.hourlimit <= c.defaulthourlimit);
  }

  filteredData() {
    var filt = this.state.filter;
    var s = this.state.search;
    return _.filter(this.state.data, d => {
      if (s && !d.name.toLowerCase().includes(s.toLowerCase()) && !d.email.toLowerCase().includes(s.toLowerCase())) {
        return false;
      }
      if (filt === 'all') {
        return true;
      } else if (filt === 'banned') {
        return d.banned;
      } else if (filt === 'nosubmit') {
        return d.inreview && !d.moderation && !d.banned; 
      } else if (filt === 'waiting') {
        return d.inreview && d.moderation && !d.banned; 
      } else if (filt === 'free') {
        return !d.paid && !d.inreview && !d.banned;
      } else if (filt === 'ended') {
        return !d.paid && !d.inreview && d.trialend && moment(d.trialend).isBefore(moment()) && !d.banned;
      } else if (filt === 'paid') {
        return d.paid && !d.banned;
      } else if (filt === 'paused') {
        return d.paused && !d.banned;
      } else {
        return this.probation(d);
      }
    });
  }

  setProbation = async () => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/limitcompanies', {
        ids: s,
        setdefault: true,
      });
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  setLimit = async l => {
    this.setState({isSaving: true});
    try {
      var s = _.pluck(_.filter(this.state.data, s => this.state.selected[s.id]), 'id');
      await axios.post('/api/limitcompanies', {
        ids: s,
        monthlimit: l.monthlimit,
        daylimit: l.daylimit,
        hourlimit: l.hourlimit,
        minlimit: l.minlimit,
      });
      await this.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  editLimits = () => {
    this.setState({showEditModal: true, limits: this.props.limits});
  }

  validateLimits = () => {
    for (var i in this.state.limits) {
      var l = this.state.limits[i];

      if (!l.monthlimit || !l.daylimit || !l.hourlimit || !l.minlimit) {
        return false;
      }

      try {
        parseInt(l.monthlimit, 10);
        parseInt(l.daylimit, 10);
        parseInt(l.hourlimit, 10);
        parseInt(l.minlimit, 10);
      } catch(e) {
        return false;
      }
    }
    return true;
  }

  editConfirmClicked = async ok => {
    this.setState({
      showEditModal: false,
    });
    if (!ok) {
      return;
    }

    this.setState({isSaving: true});
    try {
      var limits = this.state.limits;
      if (!limits) {
        limits = [];
      }

      _.each(this.state.limits, l => {
        l.monthlimit = parseInt(l.monthlimit, 10);
        l.daylimit = parseInt(l.daylimit, 10);
        l.hourlimit = parseInt(l.hourlimit, 10);
        l.minlimit = parseInt(l.minlimit, 10);
      });

      await axios.patch('/api/companylimits', {limits: limits});

      await this.props.reloadExtra();
    } finally {
      this.setState({isSaving: false});
    }
  }

  viewData = cid => {
    this.props.setImpersonate(cid, '/broadcasts');
  }

  diffDisplay(value) {
    if (!value) {
      return "N/A";
    }
    var diff = moment().diff(moment(value), 'days');
    if (diff >= 1) {
      return diff.toLocaleString() + 'd';
    } else {
      diff = moment().diff(moment(value), 'hours');
      if (diff >= 1) {
        return diff.toLocaleString() + 'h';
      } else {
        diff = moment().diff(moment(value), 'minutes');
        return diff.toLocaleString() + 'm';
      }
    }
  }

  modalChange = e => {
    this.setState({[e.target.id]: e.target.value});
  }

  render() {
    let columns = [{
      Header: <Checkbox className="nomargin" checked={this.state.selectAll}
                        onClick={this.onHeaderCheckClick}
                        onChange={this.onHeaderCheckChange}
                        disabled={this.state.isSaving} />,
      accessor: '',
      Cell: ({...props}) => {
        return <Checkbox className="nomargin" id={props.original.id} checked={this.isSelected(props.original)}
                         onChange={this.onCheckChange} disabled={this.state.isSaving} />;
      },
      width: 35,
      mandatory: true,
    }, {
      Header: 'Name',
      headerClassName: 'text-left',
      accessor: 'name',
      width: 150,
      Cell: ({...props}) => {
        var o = props.original;
        var n = props.value + ' - ' + o.email;
        if (o.banned) {
          n += ' (Banned)';
        } else if (o.paused) {
          n += ' (Paused)';
        } else if (!o.paid && !o.inreview && o.trialend && moment(o.trialend).isBefore(moment())) {
          n += ' (Trial Expired)';
        }
        return (
          <Link to={'/customers/edit?id=' + props.original.id}>{n}</Link>
        );
      },
    }, {
      Header: 'Opens',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'open',
      className: 'text-right',
      hidden: this.state.filter === 'nosubmit' || this.state.filter === 'waiting',
      width: 75,
    }, {
      Header: 'Hard Bounces',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'hard',
      className: 'text-right',
      hidden: this.state.filter === 'nosubmit' || this.state.filter === 'waiting',
      width: 120,
    }, {
      Header: 'Complaints',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'complaint',
      className: 'text-right',
      hidden: this.state.filter === 'nosubmit' || this.state.filter === 'waiting',
    }, {
      Header: 'Volume',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'send',
      className: 'text-right',
      hidden: this.state.filter === 'nosubmit' || this.state.filter === 'waiting',
      width: 80,
    }, {
      Header: 'Total Contacts',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'contacts',
      className: 'text-right',
      width: 120,
    }, {
      Header: 'Broadcast Queue',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'cqueue',
      className: 'text-right',
      hidden: this.state.filter === 'banned' || this.state.filter === 'nosubmit' || this.state.filter === 'waiting' || this.state.filter === 'ended',
      width: 150,
    }, {
      Header: 'Funnel Queue',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'fqueue',
      className: 'text-right',
      hidden: this.state.filter === 'banned' || this.state.filter === 'nosubmit' || this.state.filter === 'waiting' || this.state.filter === 'ended',
      width: 120,
    }, {
      Header: 'Transactional Queue',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'tqueue',
      className: 'text-right',
      hidden: this.state.filter === 'banned' || this.state.filter === 'nosubmit' || this.state.filter === 'waiting' || this.state.filter === 'ended',
      width: 160,
    }, {
      Header: 'Postal Routes',
      Cell: ({...props}) => {
        var route = 'None';
        if (props.value && props.value.length) {
          route = _.map(props.value, r => {
            var f = _.find(this.props.routes, o => o.id === r);
            if (f)
              return f.name;
            return '<Deleted>';
          }).join(', ');
        }
        return route;
      },
      accessor: 'routes',
      className: 'text-right',
      width: 125,
      hidden: this.state.filter !== 'all',
    }, {
      Header: 'Last Use',
      Cell: ({...props}) => this.diffDisplay(props.value),
      accessor: 'lasttime',
    }, {
      Header: 'Age',
      headerClassName: 'text-right',
      Cell: ({...props}) => this.diffDisplay(props.value),
      accessor: 'created',
      className: 'text-right',
      width: 60,
    }, {
      Header: 'Daily Limit',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value === null || _.isUndefined(props.value) ? 'N/A' : props.value.toLocaleString(),
      accessor: 'daylimit',
      className: 'text-right',
      hidden: this.state.filter === 'banned' || this.state.filter === 'nosubmit' || this.state.filter === 'ended',
      width: 120,
    }, {
      Header: 'Monthly Limit',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value === null || _.isUndefined(props.value) ? 'N/A' : props.value.toLocaleString(),
      accessor: 'monthlimit',
      className: 'text-right',
      hidden: this.state.filter === 'banned' || this.state.filter === 'nosubmit' || this.state.filter === 'ended',
      width: 120,
    }];

    var data = this.filteredData();

    return (
      <div className="customers">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Customers"
            button={
              <Timeframe initialStart={this.state.start} initialEnd={this.state.end} onChange={this.setDates} />
            } />
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDTableSection>
              <Modal show={this.state.showEditModal} bsSize="large">
                <Modal.Header>
                  <Modal.Title>Edit Limits</Modal.Title>
                </Modal.Header>
                <Modal.Body id="msform">
                  <EDDataSheet
                    id="limits"
                    label="Sending IPs and Domains"
                    obj={this.state}
                    onChange={this.handleChange}
                    columns={[{display: 'Name', name: 'name'},
                              {display: 'Monthly Limit', name: 'monthlimit'},
                              {display: 'Daily Limit', name: 'daylimit'},
                              {display: 'Hourly Limit', name: 'hourlimit'},
                              {display: 'Limit Per Min.', name: 'minlimit'},
                    ]}
                    widths={[undefined, undefined, undefined]}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={this.editConfirmClicked.bind(null, true)} bsStyle="primary" disabled={!this.validateLimits()}>OK</Button>
                  <Button onClick={this.editConfirmClicked.bind(null, false)}>Cancel</Button>
                </Modal.Footer>
              </Modal>
              <Modal show={this.state.showConfirmModal}>
                <Modal.Header>
                  <Modal.Title>Confirmation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {this.state.showApproveText &&
                    <FormControlLabel
                      id="approveText"
                      label="Message for Ticket"
                      componentClass="textarea"
                      obj={this.state}
                      onChange={this.modalChange}
                      placeholder={this.state.placeholder}
                      rows={5}
                    />
                  }
                  <p>Are you sure you wish to {this.state.confirmAction}?</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={this.confirmClicked.bind(null, true)} bsStyle="primary">OK</Button>
                  <Button onClick={this.confirmClicked.bind(null, false)}>Cancel</Button>
                </Modal.Footer>
              </Modal>
              {
                this.state.data !== null &&
                <div className="space20 row">
                  <div className="col-xs-6">
                    <FormControl id="filter" componentClass="select" value={this.state.filter} onChange={this.handleChange} style={{width: 'auto'}}>
                      <option value="all">All</option>
                      <option value="banned">Banned</option>
                      <option value="nosubmit">No Approval Submitted</option>
                      <option value="waiting">Awaiting Approval</option>
                      <option value="free">Free Trial</option>
                      <option value="ended">Trial Ended</option>
                      <option value="paid">Paid</option>
                      <option value="paused">Paused</option>
                      <option value="probation">Probation</option>
                    </FormControl>
                  </div>
                  <div className="col-xs-6 text-right">
                    <Button
                      bsStyle="primary"
                      onClick={this.createClicked}
                      style={{ marginRight: '5px', marginLeft: '10px', background: '#2dcca1', color: '#fff', fontWeight: '600', border: '1px solid #2dcca1' }}>
                      Add Customer
                    </Button>
                    <Button
                      bsStyle="default"
                      onClick={() => this.props.history.push("/frontends")}
                      style={{ marginLeft: '5px', marginRight: '10px', background: '#7A9BAC', color: '#fff', fontWeight: '600', border: '1px solid #A9A9A9' }}>
                      Advanced Configuration
                    </Button>
                  </div>
                </div>
              }
              {
                this.state.data !== null &&
                (data.length ?
                  <div className="queue-dropdown">
                    <ConfirmDropdown
                      id="cust-split"
                      text="Actions"
                      className="green space-top-sm"
                      menu="Delete"
                      title="Delete Customer Confirmation"
                      extra={true}
                      disabled={this.menuDisabled(false) || this.state.isSaving}
                      prompt={this.deletePrompt()}
                      onConfirm={this.deleteConfirmClicked}>
                      <MenuItem onClick={() => {
                        sendGA4Event('Customers Page', 'Login as Customer', 'Logged in as Customer Account');
                        return this.impersonate();
                      }} disabled={this.menuDisabled(false)}>Login as Customer</MenuItem>
                      <MenuItem onClick={() => {
                        sendGA4Event('Customers Page', 'Purged Broadcasts', 'Purged Broadcast Queue');
                        return this.purge('c');
                      }} disabled={this.menuDisabled(true)}>Purge Broadcast Queue</MenuItem>
                      <MenuItem onClick={() => {
                        sendGA4Event('Customers Page', 'Purged Funnels', 'Purged Funnel Queue');
                        return this.purge('f');
                      }} disabled={this.menuDisabled(true)}>Purge Funnel Queue</MenuItem>
                      <MenuItem onClick={() => {
                        sendGA4Event('Customers Page', 'Purged Transactional', 'Purged Transactional Queue');
                        return this.purge('t');
                      }} disabled={this.menuDisabled(true)}>Purge Transactional Queue</MenuItem>
                      <MenuItem onClick={this.edit} disabled={this.menuDisabled(false)}>Edit</MenuItem>
                      <MenuItem onClick={this.approve} disabled={this.menuDisabled(true)}>Approve</MenuItem>
                      <MenuItem onClick={this.ban} disabled={this.menuDisabled(true)}>Ban</MenuItem>
                      <MenuItem onClick={this.unban} disabled={this.menuDisabled(true)}>Unban</MenuItem>
                      <MenuItem onClick={this.pause} disabled={this.menuDisabled(true)}>Pause</MenuItem>
                      <MenuItem onClick={this.unpause} disabled={this.menuDisabled(true)}>Unpause</MenuItem>
                    </ConfirmDropdown>                        
                    <ReactTable
                      data={data}
                      columns={_.filter(columns, c => !c.hidden)}
                      minRows={0}
                      sorted={this.state.sorted}
                      page={this.state.page}
                      pageSize={this.state.pageSize}
                      onPageChange={this.onPageChange}
                      onPageSizeChange={this.onPageSizeChange}
                      onSortedChange={this.onSortedChange}
                    />
                  </div>
                  :
                  <div className="text-center space-top-sm">
                    {
                      this.state.data.length ?
                        <h4>No customers found for filter.</h4>
                      :
                        <h4>No customers configured!</h4>
                    }
                  </div>)
            }
            </EDTableSection>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Customers,
  initial: [],
  get: async () => [],
  extra: {
    routes: async () => (await axios.get('/api/routes')).data,
    limits: async () => (await axios.get('/api/companylimits')).data.limits,
  }
});
