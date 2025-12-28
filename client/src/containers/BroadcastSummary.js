import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Nav, NavItem, Button } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import TitlePage from "../components/TitlePage";
import _ from "underscore";
import notify from "../utils/notify";
import parse from "../utils/parse";
import qs from "qs";
import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
import ClientPopup from "../components/ClientPopup";

import "./BroadcastSummary.css";

momentDurationFormatSetup(moment);

class BroadcastSummary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showClientPopup: false,
      clientTitle: '',
      clientColumns: [],
      clientStats: [],
    };
  }

  clientPopupClosed = () => {
    this.setState({showClientPopup: false});
  }

  clientPopup = (title, columns, stats) => {
    this.setState({clientTitle: title, clientColumns: columns, clientStats: stats, showClientPopup: true});
  }

  switchView = url => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push(url + '&' + qs.stringify(p));
  }

  goBack = () => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push('/broadcasts?' + qs.stringify(p));
  }

  ignore = event => {
    event.preventDefault();
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  pct(l, n, prop) {
    if (!prop)
      prop = 'count'
    if (!l[prop] || !_.isNumber(l[prop]) || !n)
      return '0%'
    var v = (n/l[prop])*100;
    var r = Math.round(v)
    return r + '%';
  }

  exportClicked = async id => {
    await axios.post('/api/broadcasts/' + this.props.id + '/export');

    notify.show('Download your export file from the Data Exports page', "success");
  }

  render() {
    var p = parse(this);
    var c = this.props.data;
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `Broadcast Summary ${dataName ? `for "${dataName}"` : ''}`;

    var totals = {
      devices: 0,
      browsers: 0,
      locations: 0,
    };
    if (this.props.stats) {
      this.props.stats.devices.forEach(d => {
        totals.devices += d.count;
      });
      this.props.stats.browsers.forEach(b => {
        totals.browsers += b.count;
      });
      this.props.stats.locations.forEach(l => {
        totals.locations += l.count;
      });
    }
    
    return (
      <div>
        <SaveNavbar title={title} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="1">
                  <NavItem eventKey="1" disabled>Summary</NavItem>
                  <NavItem eventKey="2" onClick={this.switchView.bind(null, '/broadcasts/heatmap?id=' + this.props.id)}>Heatmap</NavItem>
                  <NavItem eventKey="3" onClick={this.switchView.bind(null, '/broadcasts/domains?id=' + this.props.id)}>Domains</NavItem>
                  <NavItem eventKey="4" onClick={this.switchView.bind(null, '/broadcasts/summarysettings?id=' + this.props.id)}>Settings</NavItem>
                </Nav>
              </EDTabs>
            } button={
              this.props.user && !this.props.user.nodataexport &&
              <Button bsStyle="primary" onClick={this.exportClicked}>Export Data</Button>
            }/>
            <EDTableSection>
              <div className="bc-container space50">
                <div className="bc-box space10">
                  <h4 className="text-center">Delivery</h4>
                  <div>
                    <table className="bc-table">
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
                        <tr>
                          <td>
                            Hard Bounce
                          </td>
                          <td className="text-right">
                            {this.num(c.hard)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.hard, 'delivered')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Soft Bounce
                          </td>
                          <td className="text-right">
                            {this.num(c.soft)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.soft, 'delivered')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Domains
                          </td>
                          <td className="text-right">
                            {this.num(c.domaincount)}
                          </td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bc-box space10">
                  <h4 className="text-center">Opens</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        <tr>
                          <td>
                            Total
                          </td>
                          <td className="text-right">
                            {
                              c.opened_all > 0 ?
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=open&isbc=true&returnto=${encodeURIComponent('/broadcasts/summary?' + qs.stringify(p))}`}>
                                  {this.num(c.opened_all)}
                                </Link>
                              :
                                this.num(c.opened_all)
                            }
                          </td>
                          <td/>
                        </tr>
                        <tr>
                          <td>
                            Unique
                          </td>
                          <td className="text-right">
                            {this.num(c.opened)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.opened, 'send')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Duplicate
                          </td>
                          <td className="text-right">
                            {this.num(c.opened_all - c.opened)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.opened_all - c.opened, 'opened')})
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bc-box space10">
                  <h4 className="text-center">Clicks</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        <tr>
                          <td>
                            Total
                          </td>
                          <td className="text-right">
                            {
                              c.clicked_all > 0 ?
                              <Link to={`/broadcasts/details?id=${this.props.id}&cmd=click&isbc=true&returnto=${encodeURIComponent('/broadcasts/summary?' + qs.stringify(p))}`}>
                                {this.num(c.clicked_all)}
                              </Link>
                            :
                              this.num(c.clicked_all)
                            }
                          </td>
                          <td/>
                        </tr>
                        <tr>
                          <td>
                            Unique
                          </td>
                          <td className="text-right">
                            {this.num(c.clicked)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.clicked, 'send')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Duplicate
                          </td>
                          <td className="text-right">
                            {this.num(c.clicked_all - c.clicked)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.clicked_all - c.clicked, 'clicked')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            CTR
                          </td>
                          <td className="text-right">
                           {this.pct(c, c.clicked, 'opened')}
                          </td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bc-box space10">
                  <h4 className="text-center">Unsubscribes</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        <tr>
                          <td>
                            Unsubscribed
                          </td>
                          <td className="text-right">
                            {
                              c.unsubscribed > 0 ?
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=unsub&isbc=true&returnto=${encodeURIComponent('/broadcasts/summary?' + qs.stringify(p))}`}>
                                  {this.num(c.unsubscribed)}
                                </Link>
                              :
                                this.num(c.unsubscribed)
                            }
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Complained
                          </td>
                          <td className="text-right">
                            {
                              c.complained > 0 ?
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=complaint&isbc=true&returnto=${encodeURIComponent('/broadcasts/summary?' + qs.stringify(p))}`}>
                                  {this.num(c.complained)}
                                </Link>
                              :
                                this.num(c.complained)
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              { this.props.stats &&
              <div className="bc-container">
                <div className="bc-box space10">
                  <h4 className="text-center">Devices</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        {
                          _.map(this.props.stats.devices.slice(0, 5), d =>
                            <tr key={d.device}>
                              <td>
                                {d.device}
                              </td>
                              <td className="text-right">
                                {this.num(d.count)}
                              </td>
                              <td className="text-right">
                               ({this.pct(totals, d.count, 'devices')})
                              </td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bc-box space10">
                  <h4 className="text-center">Browsers</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        {
                          _.map(this.props.stats.browsers.slice(0, 5), b =>
                            <tr key={b.os+'-'+b.browser}>
                              <td>
                                {(b.os === 'Unknown' && b.browser === 'Unknown') ?
                                  b.browser
                                    :
                                  b.os + ' ' + b.browser
                                }
                              </td>
                              <td className="text-right">
                                {this.num(b.count)}
                              </td>
                              <td className="text-right">
                               ({this.pct(totals, b.count, 'browsers')})
                              </td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                    {
                      this.props.stats.browsers.length > 5 && 
                        <a className="more-link" href="#p" onClick={
                          this.clientPopup.bind(null, "All Browsers", [
                            {name: 'OS', prop: 'os'},
                            {name: 'Browser', prop: 'browser'},
                            {name: 'Count', prop: 'count', align: 'right'},
                            {name: 'Percent', prop: 'pct', align: 'right'},
                          ], _.map(this.props.stats.browsers, b => (
                            { os: b.os, browser: b.browser, count: this.num(b.count), pct: this.pct(totals, b.count, 'browsers') }
                          )))
                        }>...</a>
                    }
                  </div>
                </div>
                <div className="bc-box space10 double">
                  <h4 className="text-center">Locations</h4>
                  <div>
                    <table className="bc-table">
                      <tbody>
                        {
                          _.map(this.props.stats.locations.slice(0, 5), l =>
                            <tr key={l.country_code+'-'+l.region}>
                              <td>
                                {l.country_code + ': ' + l.region}
                              </td>
                              <td className="text-right">
                                {this.num(l.count)}
                              </td>
                              <td className="text-right">
                               ({this.pct(totals, l.count, 'locations')})
                              </td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                    {
                      this.props.stats.locations.length > 5 && 
                        <a className="more-link" href="#p" onClick={
                          this.clientPopup.bind(null, "All Locations", [
                            {name: 'Country', prop: 'country'},
                            {name: 'Region', prop: 'region'},
                            {name: 'Count', prop: 'count', align: 'right'},
                            {name: 'Percent', prop: 'pct', align: 'right'},
                          ], _.map(this.props.stats.locations, l => (
                            { country: l.country, region: l.region, count: this.num(l.count), pct: this.pct(totals, l.count, 'locations') }
                          )))
                        }>...</a>
                    }
                  </div>
                </div>
              </div>
              }
              <div className="bc-status">
                Broadcast started: {moment(c.sent_at).format('l LT')}
                {
                  c.finished_at &&
                  <span>
                    Broadcast ended: {moment(c.finished_at).format('l LT')}
                  </span>
                }
                {
                  c.finished_at &&
                  <span>
                    Total runtime: {moment.duration(moment(c.finished_at).diff(moment(c.sent_at))).format()}
                  </span>
                }
              </div>
              <ClientPopup show={this.state.showClientPopup} onClose={this.clientPopupClosed} title={this.state.clientTitle} columns={this.state.clientColumns} stats={this.state.clientStats} />
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastSummary,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  extra: {
    stats: async ({id}) => (await axios.get('/api/broadcasts/' + id + '/clientstats')).data,
  },
});
