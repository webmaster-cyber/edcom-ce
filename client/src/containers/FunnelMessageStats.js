import React, { Component } from "react";
import { Row, Col, Nav, NavItem, FormGroup } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import { Link } from "react-router-dom";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import _ from "underscore";
import { EDTabs, EDTable, EDTableRow, EDTableSection } from "../components/EDDOM";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import parse from "../utils/parse";
import ClientPopup from "../components/ClientPopup";
import { getLinks, decode, typedescs } from "../utils/template-utils";
import { ReadOnlyTemplateEditor } from "../components/TemplateEditor";
import ReactTable from "react-table";
import qs from "qs";

function pct(n, d) {
  if (!d || !n)
    return 0;
  var r = (n/d) * 100;
  if (r > 100) {
    r = 100;
  }
  return r;
}

class FunnelMessageStats extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'count', desc: true},
    ];

    if (p.tablestate) {
      var ts = JSON.parse(p.tablestate);
      page = ts.page;
      pageSize = ts.pageSize;
      sorted = ts.sorted;
    }

    var activeKey = '1';
    if (p.domains) {
      activeKey = '3';
    }

    this.state = {
      page: page,
      pageSize: pageSize,
      sorted: sorted,
      activeKey: activeKey,
      showClientPopup: false,
      clientTitle: '',
      clientColumns: [],
      clientStats: [],
    };
  }

  tableState = () => {
    return 'tablestate=' + encodeURIComponent(JSON.stringify(_.pick(this.state, 'page', 'pageSize', 'sorted')));
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


  clientPopupClosed = () => {
    this.setState({showClientPopup: false});
  }

  clientPopup = (title, columns, stats) => {
    this.setState({clientTitle: title, clientColumns: columns, clientStats: stats, showClientPopup: true});
  }

  onCancel = () => {
    var p = parse(this);
    this.props.history.push('/funnels/message?id=' + p.funnelid);
  }

  switchView = v => {
    this.setState({activeKey: v});
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

  parentParams = () => {
    var p = parse(this);
    delete(p.id);
    delete(p.tablestate);
    return qs.stringify(p);
  }

  returnTo = domains => {
    return encodeURIComponent('/funnels/message/stats?id=' + this.props.id + '&' + this.parentParams() + '&' + this.tableState() + (domains ? '&domains=true' : ''));
  }

  render() {
    var dataName = this.props.data && (this.props.data.subject || '');
    var title = `Message Statistics ${dataName ? `for "${dataName}"` : ''}`;

    var links = [];
    var types = [];
    var islinks = [];

    if (this.props.data.parts || this.props.data.rawText) {
      getLinks(this.props.data).forEach(d => {
        links.push(d.type === 'unsub' ? 'Built-in Unsubscribe' : decode(d.link));
        islinks.push(d.type !== 'unsub');
        types.push(typedescs[d.type]);
      });
    }

    let minWidth = '600px';
    let maxWidth = '1024px';

    var c = this.props.data;
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

    let columns = [{
      Header: 'Domain',
      accessor: 'domain',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
    }, {
      Header: 'Contacts',
      accessor: 'count',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toLocaleString()}</span>,
      className: 'text-right',
    }, {
      Header: 'Delivered',
      accessor: 'send',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Opens',
      accessor: 'open',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?isbc=false&cmd=open&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo(true)}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'CTR',
      accessor: 'ctr',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?isbc=false&cmd=click&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo(true)}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Unsubs',
      accessor: 'unsub',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?isbc=false&cmd=unsub&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo(true)}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Complaints',
      accessor: 'complaint',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?isbc=false&cmd=complaint&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo(true)}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Soft Bounces',
      accessor: 'soft',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/messages?funnel=true&type=soft&domain=' + props.original.domain + '&id=' + this.props.id + '&' + this.tableState() + '&' + this.parentParams()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Hard Bounces',
      accessor: 'hard',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/messages?funnel=true&type=hard&domain=' + props.original.domain + '&id=' + this.props.id + '&' + this.tableState() + '&' + this.parentParams()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }];

    let data = _.map(this.props.domainstats, s => {
      return {
        domain: s.domain,
        count: s.count,
        send: pct(s.send, s.count),
        ctr: pct(s.click, s.open),
        complaint: pct(s.complaint, s.send),
        unsub: pct(s.unsub, s.send),
        open: pct(s.open, s.send),
        soft: pct(s.soft, s.send+s.hard+s.soft),
        hard: pct(s.hard, s.send+s.hard+s.soft),
      };
    });

    return (
      <div>
        <SaveNavbar title={title} onBack={this.onCancel} hideSave={true} id={this.props.id} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                  <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Summary</NavItem>
                  <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Heatmap</NavItem>
                  <NavItem eventKey="3" disabled={this.state.activeKey==='3'} onClick={this.switchView.bind(null, '3')}>Domains</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='1'?'block':'none'}}>
              <Col xs={12}>
                <div className="bc-container">
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
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=open&isbc=false&returnto=${this.returnTo()}`}>
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
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=click&isbc=false&returnto=${this.returnTo()}`}>
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
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=unsub&isbc=false&returnto=${this.returnTo()}`}>
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
                                <Link to={`/broadcasts/details?id=${this.props.id}&cmd=complaint&isbc=false&returnto=${this.returnTo()}`}>
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
                <ClientPopup show={this.state.showClientPopup} onClose={this.clientPopupClosed} title={this.state.clientTitle} columns={this.state.clientColumns} stats={this.state.clientStats} />
                <div className="space30"/>
              </Col>
            </Row>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='2'?'block':'none'}}>
              <Col xs={12}>
                <section className="campaign">
                  {
                  this.props.data.linkclicks && this.props.data.linkclicks.length > 0 &&
                    <EDTable className="growing-margin-left" nospace minWidth={minWidth} maxWidth={maxWidth}>
                      <thead>
                        <tr>
                          <th>Link</th>
                          <th>Clicks</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      {
                        _.map(this.props.data.linkclicks, (cnt, index) =>
                            <EDTableRow key={index} index={index} nospace>
                              <td style={{maxWidth:'500px'}}>
                                <h4 className="name-padded" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                  { islinks[index] ?
                                    <a href={links[index]}>{links[index]}</a>
                                   :
                                    links[index]
                                  }
                                </h4>
                              </td>
                              <td>
                                {cnt.toLocaleString()}
                              </td>
                              <td>
                                {types[index]}
                              </td>
                            </EDTableRow>
                        )
                      }
                    </EDTable>
                  }
                  <FormGroup style={{position: 'relative'}}>
                    <ReadOnlyTemplateEditor data={this.props.data} />
                  </FormGroup>
                </section>
              </Col>
            </Row>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='3'?'block':'none'}}>
              <Col xs={12}>
              {
                this.props.domainstats &&
                  (this.props.domainstats.length ?
                    <ReactTable
                      className="space30"
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
                      <h4>No domain delivery data found!</h4>
                    </div>)
              }
              </Col>
            </Row>
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: FunnelMessageStats,
  get: async ({id}) => (await axios.get('/api/messages/' + id)).data,
  extra: {
    stats: async ({id}) => (await axios.get('/api/messages/' + id + '/clientstats')).data,
    domainstats: async ({id}) => (await axios.get('/api/messages/' + id + '/domainstats')).data,
  },
});
