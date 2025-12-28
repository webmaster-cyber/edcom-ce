import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, Nav, NavItem, MenuItem, FormControl } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import withLoadSave from "../components/LoadSave";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import { EDTabs, EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import notify from "../utils/notify";
import copyText from "../utils/clipboard";

import "./CustomerUsers.css";

function copy(text) {
  if (copyText(text)) {
    notify.show("API Key copied to clipboard", "success");
  } else {
    notify.show("Error accessing clipboard", "error");
  }
}

class Hidden extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isShown: false,
    };
  }

  render() {
    return (
      <div className="hide-show">
        <i className="fa fa-clipboard" onClick={copy.bind(null, this.props.value)} />
        <i className={'fa ' + (this.state.isShown ? 'fa-eye-slash' : 'fa-eye')} onClick={() => this.setState({isShown: !this.state.isShown})} />
        <FormControl type="text" readOnly={true} value={this.state.isShown ?
              this.props.value
            :
              '********************'} />
      </div>
    );
  }
}

class CustomerUsers extends Component {
  createClicked = () => {
    this.props.history.push("/user?id=new&cid=" + this.props.id); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/users/' + id);
    await this.props.reload();
  }

  onReset = async email => {
    await axios.post('/api/reset/sendemail', {email: email});

    notify.show("Password reset email sent", "success");
  }

  switchView = url => {
    this.props.history.push(url);
  }

  goBack = () => {
    this.props.history.push('/customers');
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';
    let dataName = this.props.data && (this.props.data.name || '')

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={`Users ${dataName ? `for "${dataName}"` : ''}`} hideSave={true} onBack={this.goBack} id={this.props.id}>
          <TitlePage tabs={
            <EDTabs>
              <Nav className="nav-tabs" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/customers/edit?id=' + this.props.id)}>Settings</NavItem>
                <NavItem eventKey="2" disabled>Users</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, '/customers/list-approval?id=' + this.props.id)}>List Approval</NavItem>
              </Nav>
            </EDTabs>
          } button={
            <Button bsStyle="primary" onClick={this.createClicked}>Create User</Button>
          } />
          <EDTableSection>
            {
              this.props.users && this.props.users.length ?
                <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>API Key</th>
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(this.props.users, (u, index) =>
                        <EDTableRow key={u.id} index={index}>
                          <td>
                            <ul className="list-inline">
                              <li>
                                <h4 className="name-padded">
                                  <Link to={'/user?id=' + u.id + '&cid=' + this.props.id}>
                                    {u.fullname}
                                  </Link>
                                </h4>
                              </li>
                            </ul>
                          </td>
                          <td>
                            {u.username}
                          </td>
                          <td>
                            {u.disabled ? <span className="text-danger">Disabled</span> : 'Enabled' }
                          </td>
                          <td>
                            <Hidden value={u.apikey} />
                          </td>
                          <td className="last-cell">
                            <ConfirmDropdown
                              id={u.id + '-split'}
                              menu="Delete"
                              extra={true}
                              title="Delete User Confirmation"
                              prompt={`Are you sure you wish to delete '${u.fullname}'?`}
                              onConfirm={this.deleteConfirmClicked.bind(this, u.id)}
                              text="Actions">
                              <MenuItem onClick={this.onReset.bind(null, u.username)}>Send Password Reset Email</MenuItem>
                            </ConfirmDropdown>
                          </td>
                        </EDTableRow>
                    )
                  }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  <h3>No users have been configured for this customer yet. Use the "Create User" button to create one!</h3>
                </div>
            }
          </EDTableSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: CustomerUsers,
  initial: [],
  get: async ({id}) => (await axios.get('/api/companies/' + id)).data,
  extra: {
    users: async ({id}) => (await axios.get('/api/companies/' + id + '/users')).data,
  },
});
