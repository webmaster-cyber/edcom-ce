import React, { Component } from "react";
import { Button, Modal, Nav, NavItem, MenuItem, DropdownButton } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import { FormControlLabel } from "../components/FormControls";
import { EDTabs, EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";

import "./CustomerListApproval.css";

class CustomerListApproval extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: null,
      approveText: '',
      placeholder: 'Your list data has been approved and is now available to send. Thank you!',
    };
  }

  switchView = url => {
    this.props.history.push(url);
  }

  goBack = () => {
    this.props.history.push('/customers');
  }

  onDownload = url => {
    window.location = url;
  }
  onTicket = (zendeskHost, ticketid) => {
    var win = window.open('https://' + zendeskHost + '/agent/tickets/' + ticketid, '_blank');
    win.focus();
  }

  onApprove = id => {
    this.setState({showModal: id});
  }

  approveConfirmClicked = async ok => {
    if (!ok) {
      this.setState({showModal: null});
      return;
    }

    var id = this.state.showModal;
    var txt = this.state.approveText || this.state.placeholder;

    this.setState({showModal: null});

    await axios.post('/api/companies/' + this.props.id + '/pendinglists/' + id + '/approve', {
      comment: txt,
    });

    this.props.reload();
  }

  modalChange = e => {
    this.setState({[e.target.id]: e.target.value});
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';
    let dataName = this.props.data && (this.props.data.name || '');
    let zendeskHost = this.props.users && this.props.users.zendesk_host;

    let statuses = {
      'pending': 'Pending',
      'error': 'Error',
      'complete': 'Complete',
      'skipped': 'Skipped',
    };

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={`Pending Lists ${dataName ? `for "${dataName}"` : ''}`} hideSave={true} onBack={this.goBack} id={this.props.id}>
          <TitlePage tabs={
            <EDTabs>
              <Nav className="nav-tabs" activeKey="3">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/customers/edit?id=' + this.props.id)}>Settings</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/customers/edit-users?id=' + this.props.id)}>Users</NavItem>
                <NavItem eventKey="3" disabled>List Approval</NavItem>
              </Nav>
            </EDTabs>
          } />
          <EDTableSection>
            <Modal show={this.state.showModal}>
              <Modal.Header>
                <Modal.Title>Approve List</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <FormControlLabel
                  id="approveText"
                  label="Message for Ticket"
                  componentClass="textarea"
                  obj={this.state}
                  onChange={this.modalChange}
                  placeholder={this.state.placeholder}
                  rows={5}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={this.approveConfirmClicked.bind(this, true)} bsStyle="primary">
                  Approve
                </Button>
                <Button onClick={this.approveConfirmClicked.bind(this, false)}>Cancel</Button>
              </Modal.Footer>
            </Modal>
            {
              this.props.users && this.props.users.lists.length ?
                <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Auto Validation Status</th>
                      <th>Count</th>
                      <th>Processed</th>
                      <th>Result Summary</th>
                      <th>Risk Summary</th>
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(this.props.users.lists, (u, index) =>
                        <EDTableRow key={u.id} index={index}>
                          <td>
                            <ul className="list-inline">
                              <li>
                                <h4 className="name-padded">
                                  {u.name}
                                </h4>
                              </li>
                            </ul>
                          </td>
                          <td>
                            {statuses[u.validation.status]}
                            {' '}
                            {u.validation.status === 'error' && u.validation.message}
                          </td>
                          <td>
                            {u.validation.quantity && u.validation.quantity.toLocaleString()}
                          </td>
                          <td>
                            {u.validation.records_processed && u.validation.records_processed.toLocaleString()}
                          </td>
                          <td>
                            {
                              u.validation.result &&
                                <table className="table table-condensed validation-result-table">
                                  <tbody>
                                    <tr>
                                      <td>Do Not Send</td>
                                      <td>{u.validation.result.do_not_send.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Undeliverable</td>
                                      <td>{u.validation.result.undeliverable.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Deliverable</td>
                                      <td>{u.validation.result.deliverable.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Unknown</td>
                                      <td>{u.validation.result.unknown.toLocaleString()}</td>
                                    </tr>
                                  </tbody>
                                </table>
                            }
                          </td>
                          <td>
                            {
                              u.validation.risk &&
                                <table className="table table-condensed validation-result-table">
                                  <tbody>
                                    <tr>
                                      <td>High</td>
                                      <td>{u.validation.risk.high.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Medium</td>
                                      <td>{u.validation.risk.medium.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Low</td>
                                      <td>{u.validation.risk.low.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                      <td>Unknown</td>
                                      <td>{u.validation.risk.unknown.toLocaleString()}</td>
                                    </tr>
                                  </tbody>
                                </table>
                            }
                          </td>
                          <td className="last-cell">
                            <DropdownButton
                              id={u.id + '-split'}
                              title="Actions">
                              <MenuItem disabled={!u.validation.download_url} onClick={this.onDownload.bind(null, u.validation.download_url)}>Download Report</MenuItem>
                              {
                                zendeskHost &&
                                <MenuItem onClick={this.onTicket.bind(null, zendeskHost, u.approval_ticket)}>Send Reply</MenuItem>
                              }
                              <MenuItem onClick={this.onApprove.bind(null, u.id)}>Approve</MenuItem>
                            </DropdownButton>
                          </td>
                        </EDTableRow>
                    )
                  }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  <h3>This customer does not have any pending lists</h3>
                </div>
            }
          </EDTableSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: CustomerListApproval,
  initial: [],
  get: async ({id}) => (await axios.get('/api/companies/' + id)).data,
  extra: {
    users: async ({id}) => (await axios.get('/api/companies/' + id + '/pendinglists')).data,
  },
});
