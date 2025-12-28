import React, { Component } from "react";
import { Nav, NavItem, Table, Button, FormControl } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTabs } from "../components/EDDOM";
import moment from "moment";
import notify from "../utils/notify";

import "./TransactionalLog.css";

export default class TransactionalLog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      data: null,
      page: 1
    };
  }

  async reload() {
    this.setState({isLoading: true});
    var data = await axios.get('/api/transactional/log', {
      params: {
        page: this.state.page
      }
    });
    this.setState({isLoading: false, data: data.data});
  }

  previous = () => {
    if (this.state.page <= 1) return;
    this.setState({page: this.state.page - 1}, () => this.reload());
  }

  next = () => {
    if (this.state.page >= this.maxPage()) return;
    this.setState({page: this.state.page + 1}, () => this.reload());
  }

  componentDidMount() {
    this.reload();
  }

  updatePage = e => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num)) return;
    if (num < 1) return;
    if (num > this.maxPage()) return;
    this.setState({page: num}, () => this.reload());
  }

  switchView = url => {
    this.props.history.push(url);
  }

  rowClass = event => {
    if (!event || event === 'Delivery') {
      return "table-success";
    } else if (event === 'Injection') {
      return "table-info";
    } else {
      return "table-danger";
    }
  }

  exportClicked = async () => {
    await axios.post('/api/transactional/log/export');

    notify.show('Download your export file from the Data Exports page', "success");
  }

  maxPage = () => {
    return Math.ceil(this.state.data.total / this.state.data.page_size);
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Transactional Log"
          button={
            <Button bsStyle="primary" onClick={this.exportClicked}>Export to CSV</Button>
          }
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="3">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/transactional')}>Dashboard</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/transactional/templates')}>Templates</NavItem>
                <NavItem eventKey="3" disabled>Log</NavItem>
                <NavItem eventKey="4" onClick={this.switchView.bind(null, '/transactional/settings')}>Settings</NavItem>
              </Nav>
            </EDTabs>
          }
        />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection className="white-table-section">
          {
            (this.state.data && this.state.data.records && this.state.data.records.length) ?
              <div>
                <Table className="space15 log-table" responsive>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>Tag</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-center">Opened</th>
                      <th className="text-center">Clicked</th>
                      <th className="text-center">Unsubscribed</th>
                      <th className="text-center">Complained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                    _.map(this.state.data.records, l =>
                        <tr key={l.id} className={this.rowClass(l.event)}>
                          <td>
                            {l.event || 'Delivery'}
                          </td>
                          <td>
                            {l.fromname ? l.fromname + ' <' + l.fromemail + '>' : l.fromemail}
                          </td>
                          <td>
                            {l.toname ? l.toname + ' <' + l.to + '>' : l.to}
                          </td>
                          <td>
                            {l.subject}
                          </td>
                          <td>
                            {l.tag || 'untagged'}
                          </td>
                          <td>
                            {moment(l.ts).format('l LTS')}
                          </td>
                          <td>
                            {l.error || l.status || 'OK'}
                          </td>
                          <td className="text-center">
                            {l.open ? <i className="fa fa-check-square-o" /> : ''}
                          </td>
                          <td className="text-center">
                            {l.click ? <i className="fa fa-check-square-o" /> : ''}
                          </td>
                          <td className="text-center">
                            {l.unsub ? <i className="fa fa-check-square-o" /> : ''}
                          </td>
                          <td className="text-center">
                            {l.complaint ? <i className="fa fa-check-square-o" /> : ''}
                          </td>
                        </tr>
                    )
                  }
                  </tbody>
                </Table>
                {
                  this.maxPage() > 1 &&
                  <div className="form-inline space-bottom" style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                    <Button style={{width: '120px'}} onClick={this.previous} disabled={this.state.page <= 1}>Previous</Button>
                    <span>
                      Page{' '}
                      <FormControl
                        className="table-page-input"
                        type="number"
                        min={1}
                        max={this.maxPage()}
                        step="1"
                        value={this.state.page}
                        onChange={this.updatePage}
                        style={{width: '75px', textAlign: 'right'}}
                      />
                      {' '}of {this.maxPage()}
                    </span>
                    <Button style={{width: '120px'}} onClick={this.next} disabled={this.state.page >= this.maxPage()}>Next</Button>
                  </div>
                }
              </div>
              :
              <div className="text-center space-top-sm">
                <h4>No transactional messages found!</h4>
                <h5>When you send them, your most recent transactional messages will appear here.</h5>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}
