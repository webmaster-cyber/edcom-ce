import React, { Component } from "react";
import { Nav, NavItem } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import TitlePage from "../components/TitlePage";
import _ from "underscore";
import parse from "../utils/parse";
import qs from "qs";
import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";

import "./BroadcastSummary.css";

momentDurationFormatSetup(moment);

class TransactionalTag extends Component {
  switchView = url => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push(url + '&' + qs.stringify(p));
  }

  goBack = () => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push('/transactional?' + qs.stringify(p));
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

  render() {
    var p = parse(this);
    var c = this.props.data;
    var title = `Transactional Summary for ${this.props.id}`;

    return (
      <div>
        <SaveNavbar title={title} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="1">
                  <NavItem eventKey="1" disabled>Summary</NavItem>
                  <NavItem eventKey="3" onClick={this.switchView.bind(null, '/transactional/domains?id=' + this.props.id)}>Domains</NavItem>
                </Nav>
              </EDTabs>
            } />
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
                            Delivered
                          </td>
                          <td className="text-right">
                            {this.num(c.send)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.send, 'count')})
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
                           ({this.pct(c, c.hard, 'count')})
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
                           ({this.pct(c, c.soft, 'count')})
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
                            {this.num(c.open_all)}
                          </td>
                          <td/>
                        </tr>
                        <tr>
                          <td>
                            Unique
                          </td>
                          <td className="text-right">
                            {this.num(c.open)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.open, 'send')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Duplicate
                          </td>
                          <td className="text-right">
                            {this.num(c.open_all - c.open)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.open_all - c.open, 'open')})
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
                            {this.num(c.click_all)}
                          </td>
                          <td/>
                        </tr>
                        <tr>
                          <td>
                            Unique
                          </td>
                          <td className="text-right">
                            {this.num(c.click)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.click, 'send')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Duplicate
                          </td>
                          <td className="text-right">
                            {this.num(c.click_all - c.click)}
                          </td>
                          <td className="text-right">
                           ({this.pct(c, c.click_all - c.click, 'click')})
                          </td>
                        </tr>
                        <tr>
                          <td>
                            CTR
                          </td>
                          <td className="text-right">
                           {this.pct(c, c.click, 'open')}
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
                            {this.num(c.unsub)}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Complained
                          </td>
                          <td className="text-right">
                            {this.num(c.complaint)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bc-status">
                  Showing stats from
                  {' '}
                  {moment(p.start).format('l LT')}
                  {' '}
                  until
                  {' '}
                  {
                    moment().diff(moment(p.end)) < 0 ?
                      'now'
                    :
                      moment(p.end).format('l LT')
                  }
                  {' '}
                  ({moment.duration((moment().diff(moment(p.end)) < 0 ? moment() : moment(p.end)).diff(moment(p.start))).format()})
                </div>
              </div>
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: TransactionalTag,
  get: async ({id, start, end}) => (await axios.get('/api/transactional/tag/' + id + '?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end))).data,
});
