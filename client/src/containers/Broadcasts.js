import React, { Component } from "react";
import { Nav, NavItem, MenuItem, Button, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import LoaderButton from "../components/LoaderButton";
import { EDTabs, EDTableSection, EDTable, EDTableRow, EDCardsContainer, EDCard } from "../components/EDDOM";
import moment from "moment";
import notify from "../utils/notify";
import TablePie from "../components/TablePie2";
import SearchControl from "../components/SearchControl";
import parse from "../utils/parse";
import qs from "qs";
import classnames from "classnames";

import "./Broadcasts.css";
/* eslint import/no-webpack-loader-syntax: off */
import WarningIcon from '-!svg-react-loader!../svg/warning.svg';
import MessageIcon from '-!svg-react-loader!../svg/menu-icons/frontend-navigation-messages.svg';
import BullhornIcon from '-!svg-react-loader!../svg/bullhorn.svg';
import StatusIcon from '-!svg-react-loader!../svg/status.svg';
import StartedIcon from '-!svg-react-loader!../svg/started.svg';

export default class Broadcasts extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: '1',
      isLoading: false,
      loadingOlder: false,
      data: [],
      count: 0,
      hasnewer: false,
      hasolder: false,
      search: '',
      lastParams: '',
    }
  }

  componentWillMount() {
    this.reload(false, true, undefined, parse(this))
  }

  needsAlert(c) {
    return this.highBounces(c) || this.highComplaints(c) || c.overdomaincomplaint || c.overdomainbounce || (c.error && !c.canceled);
  }

  pctnum(l, n, prop) {
    if (!prop) {
      prop = 'count';
    }
    if (!l[prop] || !_.isNumber(l[prop]) || !n) {
      return 0.0;
    }
    return (n/l[prop])*100;
  }

  highBounces(c) {
    var rate = 2.0;
    if (this.props.user && this.props.user.frontend)
      rate = this.props.user.frontend.bouncerate;
    return this.pctnum(c, c.bounced, 'delivered') >= rate ||
           this.pctnum(c, c.soft, 'delivered') >= rate;
  }

  highComplaints(c) {
    var rate = 2.0;
    if (this.props.user && this.props.user.frontend)
      rate = this.props.user.frontend.complaintrate;
    return this.pctnum(c, c.complained, 'send') >= rate;
  }

  getList(tab) {
    if (tab === '1') {
      return _.filter(this.state.data, c => c.sent_at);
    } else if (tab === '2') {
      return _.sortBy(_.filter(this.state.data, c => !c.sent_at && c.scheduled_for), c => c.scheduled_for);
    } else {
      return _.filter(this.state.data, c => !c.sent_at && !c.scheduled_for);
    }
  }

  countText(tab) {
    if (!this.state.data || !this.state.data.length)
      return '';
    var cnt;
    if (tab === '1') {
      cnt = this.state.count;
    } else {
      cnt = this.getList(tab).length;
    }
    if (!cnt)
      return '';
    return ' (' + cnt + ')';
  }

  tabName(tab) {
    if (tab === '1') {
      return 'Sent';
    } else if (tab === '2') {
      return 'Scheduled';
    } else {
      return 'Draft';
    }
  }

  viewOlder = async () => {
    this.setState({loadingOlder: true});
    try {
      var completed = _.filter(this.state.data, c => c.sent_at);
      var params = qs.stringify({older: completed[completed.length-1].sent_at, search: this.state.search});
      var data = (await axios.get('/api/broadcasts?' + params)).data;

      data.campaigns = data.broadcasts;

      this.setState({data: _.filter(this.state.data, c => !c.sent_at).concat(data.campaigns), hasnewer: true, hasolder: data.count > 10,
                     lastParams: params});
    } finally {
      this.setState({loadingOlder: false});
    }
  }

  viewNewer = async () => {
    this.setState({loadingOlder: true});
    try {
      var completed = _.filter(this.state.data, c => c.sent_at);
      var params = qs.stringify({newer: completed[0].sent_at, search: this.state.search});
      var data = (await axios.get('/api/broadcasts?' + params)).data;

      data.campaigns = data.broadcasts;

      this.setState({data: _.filter(this.state.data, c => !c.sent_at).concat(data.campaigns), hasolder: true, hasnewer: data.count > 10,
                     lastParams: params});
    } finally {
      this.setState({loadingOlder: false});
    }
  }

  searchChanged = s => {
    this.setState({search: s}, () => {
      this.reload();
    })
  }

  reload = async (hideLoading, changeTab, tabnum, initialParams) => {
    if (initialParams && initialParams.search) {
      this.setState({isLoading: !hideLoading, search: initialParams.search});
    } else {
      this.setState({isLoading: !hideLoading});
    }

    try {
      var params;
      var hasNewer = false;
      var hasOlder = false;
      if (initialParams) {
        params = 'search=' + encodeURIComponent(initialParams.search || '');
        if (initialParams.older) {
          params += '&older=' + initialParams.older;
          hasNewer = true;
        } else if (initialParams.newer) {
          params += '&newer=' + initialParams.newer;
          hasOlder = true;
        }
      } else {
        params = 'search=' + encodeURIComponent(this.state.search);
      }
      var data = (await axios.get('/api/broadcasts?' + params)).data;

      data.campaigns = data.broadcasts;

      this.setState({data: data.campaigns, count: data.count, hasnewer: hasNewer || (hasOlder && data.count > 10), hasolder: hasOlder || data.count > 10, lastParams: params}, () => {
        if (changeTab) {
          if (tabnum) {
            this.setState({activeTab: tabnum, isLoading: false});
          } else {
            if (this.getList('1').length)
              this.setState({activeTab: '1', isLoading: false});
            else if (this.getList('2').length)
              this.setState({activeTab: '2', isLoading: false});
            else
              this.setState({activeTab: '3', isLoading: false});
          }
        } else if (!hideLoading) {
          this.setState({isLoading: false});
        }
      });
    } catch (e) {
      this.setState({isLoading: false});
    }
  }

  switchView = tab => {
    if (tab === '1' && (this.state.lastParams.includes('older=') || this.state.lastParams.includes('newer='))) {
      this.reload(false, true, tab);
    } else {
      this.setState({activeTab: tab});
    }
  }

  createClicked = async () => {
    this.props.history.push("/broadcasts/settings?id=new");
  }

  cancelConfirmClicked = async id => {
    await axios.post('/api/broadcasts/' + id + '/cancel');
    notify.show('Cancel request sent', 'success');
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/broadcasts/' + id);
    await this.reload();
  }

  duplicateClicked = async id => {
    await axios.post('/api/broadcasts/' + id + '/duplicate');

    var data = (await axios.get('/api/broadcasts')).data;

    let broadcasts = _.filter(this.state.data, c => c.sent_at || c.scheduled_for).concat(data.broadcasts.filter(c => !c.sent_at && !c.scheduled_for));

    this.setState({data: broadcasts});
  }

  updateClicked = id => {
    this.props.history.push('/broadcasts/update?id=' + id + '&' + this.state.lastParams);
  }

  exportClicked = async id => {
    await axios.post('/api/broadcasts/' + id + '/export');

    notify.show('Download your export file from the Data Exports page', "success");
  }

  viewClicked = id => {
    this.props.history.push('/broadcasts/summary?id=' + id + '&' + this.state.lastParams);
  }

  componentDidMount() {
    this._interval = setInterval(() => {
      if (!this.state.loadingOlder && !this.state.hasnewer) {
        this.reload(true);
      }
    }, 20000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  pct(l, n, prop) {
    if (!prop)
      prop = 'count'
    if (!l[prop] || !_.isNumber(l[prop]) || !n)
      return '0.0%'
    var v = (n/l[prop])*100;
    var r = Math.round(v)
    if (r < 10) {
      return v.toFixed(1) + '%';
    } else {
      return r + '%';
    }
  }

  campCounts(c) {
    if (!c.sent_at) {
      return '';
    }
    if (_.isNumber(c.count)) {
      return (
        <table>
          <tbody>
            <tr>
              <td>
                Recipients
              </td>
              <td className="text-right">
                {this.num(c.count)}
              </td>
              <td/>
            </tr>
            <tr>
              <td>
                Attempted
              </td>
              <td className="text-right">
                {this.num(c.delivered)}
              </td>
              <td/>
            </tr>
            <tr>
              <td>
                Delivered
              </td>
              <td className="text-right">
                {this.num(c.send)}
              </td>
              <td className="text-right">
                ({this.pct(c, c.send, 'delivered')})
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    return "";
  }

  status(c) {
    if (c.canceled) {
      return 'Canceled';
    } else if (c.error) {
      return 'Error';
    } else if (c.finished_at) {
      return 'Complete';
    } else {
      if (c.scheduled_for && !c.sent_at) {
        return 'Scheduled';
      } else if (!c.count) {
        return 'Initializing';
      } else if (c.sent_at) {
        return 'Sending';
      } else {
        return 'Draft';
      }
    }
  }

  campPct(c, prop) {
    if (!_.isNumber(c.count) || c.count === 0)
      return 0.0;
    return (c[prop] / c.count) * 100;
  }

  render() {
    const at = this.state.activeTab;
    let minWidth = '1290px';
    const maxWidth = '1290px';

    return (
      <div className="broadcasts">
        <MenuNavbar {...this.props}>
        <TitlePage title="Broadcasts" button={
            <LoaderButton
              bsStyle="primary"
              text="Create Broadcast"
              loadingText="Creating..."
              onClick={this.createClicked}
            />
          } tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey={at}>
                {
                  _.map(['1', '2', '3'], t => {
                    return <NavItem eventKey={t} key={t} onClick={this.switchView.bind(this, t)} className={'tab-' + t}>{this.tabName(t) + this.countText(t)}</NavItem>
                  })
                }
              </Nav>
            </EDTabs>
          } />
          <EDTableSection>
          {
            at === '1' &&
            <div style={{marginLeft: '4%', marginRight: 'auto', maxWidth}}>
              <div className="pull-right" style={{paddingTop: '8px', paddingBottom: '8px'}}>
                <SearchControl onChange={this.searchChanged} value={this.state.search} />
              </div>
            </div>
          }
            <LoaderPanel isLoading={this.state.isLoading}>
            {['1', '2'].indexOf(at) >= 0 &&
              (this.getList(at).length ?
                <EDTable nospace={at === '1'} minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>
                        { at === '1' ?
                          'Opened'
                          :
                          'Scheduled For'
                        }
                      </th>
                      {
                        at === '1' ?
                        <th>CTR</th>
                        :
                        <th></th>
                      }
                      {
                        at === '1' ?
                        <th>Unsubscribed</th>
                        :
                        <th></th>
                      }
                      {
                        at === '1' ?
                        <th>Complaints</th>
                        :
                        <th></th>
                      }
                      {
                        at === '1' ?
                        <th>Status</th>
                        :
                        <th></th>
                      }
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(this.getList(at), (c, index) => {
                      const finished = c.finished_at || c.canceled || c.error;

                      return (
                      <EDTableRow key={c.id} index={index}
                        topExtra={
                          <tr>
                            <td colSpan={7} className="broadcasts-topextra-td">
                              <div className="broadcasts-topextra">
                                <BullhornIcon className="bullhorn-icon"/>
                                <Link to={
                                    c.sent_at ?
                                    '/broadcasts/summary?id=' + c.id + '&' + this.state.lastParams
                                    :
                                    '/broadcasts/review?id=' + c.id
                                  }>
                                    {c.name}
                                </Link>
                              </div>
                            </td>
                          </tr>
                        }
                        extra={
                          <tr>
                            <td colSpan={7} className="broadcasts-extra-td">
                              <div className="broadcasts-extra">
                                <div className="broadcasts-extra-left">
                                  <div className={classnames("broadcasts-extra-status", {border: this.needsAlert(c)})}>
                                    <StatusIcon className="status-icon"/>
                                    Status :
                                    <span className="broadcasts-extra-status-text"> {this.status(c)}</span>
                                  </div>
                                  {
                                    this.needsAlert(c) &&
                                    <div className="broadcasts-extra-warn">
                                      {
                                        (!(c.error && !c.canceled) && this.highBounces(c)) &&
                                        <div className="broadcasts-extra-warn-item">
                                          <WarningIcon className="warning-icon"/>
                                          <span className="broadcasts-extra-warn-item-warning">Warning : </span>
                                          <span className="broadcasts-extra-warn-item-msg">High Bounces!</span>
                                        </div>
                                      }
                                      {
                                        (!(c.error && !c.canceled) && this.highComplaints(c)) &&
                                        <div className="broadcasts-extra-warn-item">
                                          <WarningIcon className="warning-icon"/>
                                          {
                                            !this.highBounces(c) &&
                                            <span className="broadcasts-extra-warn-item-warning">Warning : </span>
                                          }
                                          <span className="broadcasts-extra-warn-item-msg">High Complaints!</span>
                                        </div>
                                      }
                                      {
                                        (!(c.error && !c.canceled) && c.overdomainbounce) &&
                                        <div className="broadcasts-extra-warn-item">
                                          <WarningIcon className="warning-icon"/>
                                          {
                                            !(this.highBounces(c) || this.highComplaints()) &&
                                            <span className="broadcasts-extra-warn-item-warning">Warning : </span>
                                          }
                                          <span className="broadcasts-extra-warn-item-msg">High Domain Bounces!</span>
                                        </div>
                                      }
                                      {
                                        (!(c.error && !c.canceled) && c.overdomaincomplaint) &&
                                        <div className="broadcasts-extra-warn-item">
                                          <WarningIcon className="warning-icon"/>
                                          {
                                            !(this.highBounces(c) || this.highComplaints() || c.overdomainbounce) &&
                                            <span className="broadcasts-extra-warn-item-warning">Warning : </span>
                                          }
                                          <span className="broadcasts-extra-warn-item-msg">High Domain Complaints!</span>
                                        </div>
                                      }
                                      {
                                       (c.error && !c.canceled) &&
                                       (
                                        (c.error.length > 90) ?
                                          <OverlayTrigger placement="bottom" overlay={
                                            <Tooltip id="broadcast-error">
                                              {c.error}
                                            </Tooltip>
                                          }>
                                            <div className="broadcasts-extra-warn-item-error text-danger cursor-pointer">
                                              {c.error}
                                            </div>
                                          </OverlayTrigger>
                                          :
                                          <div className="broadcasts-extra-warn-item-error text-danger">
                                            {c.error}
                                          </div>
                                       )
                                      }
                                    </div>
                                  }
                                </div>
                                {c.sent_at &&
                                  <div className="broadcasts-extra-started">
                                    <StartedIcon className="started-icon"/>
                                    Campaign Started
                                    <span className="broadcasts-extra-started-time"> {moment(c.sent_at).format('l LT')}</span>
                                  </div>
                                }
                              </div>
                            </td>
                          </tr>
                        }>
                        {
                          at === '1' ?
                          <td className="camp-counts-td">
                            <div className="camp-counts-table">
                              {this.campCounts(c)}
                            </div>
                            {
                              (c.sent_at && _.isNumber(c.count)) &&
                              <div className="camp-counts-border"/>
                            }
                          </td>
                          :
                          <td></td>
                        }
                        {
                          at === '1' ?
                          <td className="num-td">
                            <h5>{this.pct(c, c.opened, 'send')}</h5>
                            <p>{this.num(c.opened)}</p>
                          </td>
                          :
                          <td className="schedule-td">
                            {moment(c.scheduled_for).format('lll')}
                          </td>
                        }
                        {
                          at === '1' ?
                          <td className="num-td">
                            <h5>{this.pct(c, c.clicked, 'opened')}</h5>
                            <p>{this.num(c.clicked)}</p>
                          </td>
                          :
                          <td></td>
                        }
                        {
                          at === '1' ?
                          <td className="num-td">
                            <h5 style={{color:'#f46767'}}>{this.pct(c, c.unsubscribed, 'send')}</h5>
                            <p>{this.num(c.unsubscribed)}</p>
                          </td>
                          :
                          <td></td>
                        }
                        {
                          at === '1' ?
                          <td className="num-td">
                            <h5 style={{color:'#f46767'}}>{this.pct(c, c.complained, 'send')}</h5>
                            <p>{this.num(c.complained)}</p>
                          </td>
                          :
                          <td></td>
                        }
                        {
                          at === '1' ?
                          <td className="delivered-graph">
                            {
                               c.sent_at &&
                               <TablePie
                                value={this.campPct(c, 'send')}
                                color="#65C9A3"
                                label="Complete"
                                size={64}
                                thickness={9}
                                otherColors={['#4b7efe', '#ffc300']}
                                otherValues={[this.campPct(c, 'hard'), this.campPct(c, 'soft')]}
                              />
                            }
                          </td>
                          :
                          <td></td>
                        }
                        <td className="last-cell" style={{minWidth:'138px'}}>
                        { !c.sent_at ?
                          <ConfirmDropdown
                            id={c.id + '-split'}
                            text="Actions"
                            menu="Delete"
                            title="Delete Broadcast Confirmation"
                            prompt={"Are you sure you wish to delete '" + c.name + "'? This action is permanent."}
                            onConfirm={this.deleteConfirmClicked.bind(this, c.id)}>
                            <MenuItem onClick={() => this.props.history.push('/broadcasts/review?id=' + c.id)}>Edit</MenuItem>
                            <MenuItem onClick={this.duplicateClicked.bind(this, c.id)}>Duplicate</MenuItem>
                          </ConfirmDropdown>
                        :
                          <ConfirmDropdown
                            id={c.id + '-split'}
                            text="Actions"
                            menu={!finished ? "Cancel" : "Delete"}
                            title={!finished ? "Cancel Confirmation" : "Delete Confirmation"}
                            prompt={!finished ? "Are you sure you wish to cancel '" + c.name + "'?" : "Are you sure you wish to delete '" + c.name + "'?"}
                            onConfirm={!finished ? this.cancelConfirmClicked.bind(this, c.id) : this.deleteConfirmClicked.bind(this, c.id)}>
                            <MenuItem onClick={this.viewClicked.bind(this, c.id)}>View Report</MenuItem>
                            <MenuItem onClick={this.duplicateClicked.bind(this, c.id)}>Duplicate</MenuItem>
                            {
                            this.props.user && !this.props.user.nodataexport &&
                            <MenuItem onClick={this.exportClicked.bind(this, c.id)}>Export</MenuItem>
                            }
                            <MenuItem onClick={this.updateClicked.bind(this, c.id)}>Update</MenuItem>
                          </ConfirmDropdown>
                        }
                        </td>
                      </EDTableRow>
                      );
                    }
                    )
                  }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  {
                    (['1', '2'].indexOf(at) >= 0 && this.state.search) ?
                      <h4>No Broadcasts Found</h4>
                    :
                      <h4>No {this.tabName(at)} Broadcasts</h4>
                  }
                </div>)
            }
            {at === '3' &&
              (
              this.getList(at).length ?
              <EDCardsContainer>
                {_.map(this.getList(at), (c, index) => (
                  <EDCard key={c.id} header={
                    <div>
                      <span className="pre-title">DRAFT</span>
                      <h3 className="draft-name">
                        <Link to={'/broadcasts/settings?id=' + c.id}>
                          {c.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <MessageIcon  className="message-icon"/>
                      </Col>
                      <Col xs={12} className="text-center">
                        <p className="last-modified">{moment(c.modified).format('lll')}</p>
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={c.id + '-split'}
                          text="Actions"
                          menu="Delete"
                          title="Delete Broadcast Confirmation"
                          prompt={"Are you sure you wish to delete '" + c.name + "'? This action is permanent."}
                          onConfirm={this.deleteConfirmClicked.bind(this, c.id)}>
                          <MenuItem onClick={() => this.props.history.push('/broadcasts/settings?id=' + c.id)}>Edit</MenuItem>
                          <MenuItem onClick={this.duplicateClicked.bind(this, c.id)}>Duplicate</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>No Drafts Found</h4>
              </div>
              )
            }
            {
              (at === '1' && this.getList('1').length > 0) &&
              <div className="text-right" style={{position: 'relative', marginLeft: '4%', marginRight: 'auto', marginBottom: '30px', maxWidth}}>
                <Button onClick={this.viewNewer} disabled={this.state.loadingOlder || !this.state.hasnewer} style={{
                  display: !this.state.hasnewer ? 'none' : undefined}}>
                  View Newer
                </Button>
                <Button onClick={this.viewOlder} disabled={this.state.loadingOlder || !this.state.hasolder} style={{
                  marginLeft: '10px',
                  display: !this.state.hasolder ? 'none' : undefined}}>
                  View Older
                </Button>
              </div>
            }
            </LoaderPanel>
          </EDTableSection>
        </MenuNavbar>
      </div>
    );
  }
}
