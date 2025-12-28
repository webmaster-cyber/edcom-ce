import React, { Component } from "react";
import { Button, Nav, NavItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow, EDTabs } from "../components/EDDOM";

class DomainGroups extends Component {
  createClicked = () => {
    this.props.history.push("/domaingroups/edit?id=new"); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/domaingroups/' + id);
    await this.props.reload();
  }

  switchView = () => {
    this.props.history.push("/routes");
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="Contact List Domains" button={
          <Button bsStyle="primary" onClick={this.createClicked}>Add Contact List Domains</Button>
        } tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="2">
              <NavItem eventKey="1" onClick={this.switchView}>Postal Routes</NavItem>
              <NavItem eventKey="2" disabled>Contact List Domains</NavItem>
            </Nav>
          </EDTabs>
        } />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          {
            this.props.data.length ?
              <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th></th>
                  </tr>
                </thead>
                {
                  _.map(this.props.data, (f, index) =>
                      <EDTableRow key={f.id} index={index}>
                        <td>
                          <ul className="list-inline">
                            <li>
                              <h4 className="name-padded">
                                <Link to={'/domaingroups/edit?id=' + f.id}>
                                  {f.name}
                                </Link>
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td className="last-cell">
                          <ConfirmDropdown
                            id={f.id + '-split'}
                            menu="Delete"
                            title="Delete Confirmation"
                            prompt={"Are you sure you wish to delete '" + f.name + "'?"}
                            onConfirm={this.deleteConfirmClicked.bind(this, f.id)}
                            text="Actions">
                          </ConfirmDropdown>
                        </td>
                      </EDTableRow>
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h4>Expert use only. If you don't know what this is for, you will cripple your platform by using it incorrectly.</h4>
                <h5 className="space30">Add contact list domains here such as Gmail, Yahoo, Outlook, and iCloud to enable load balancing and routing capabilities for deliverability fine-tuning.</h5>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: DomainGroups,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/domaingroups')).data, d => d.name.toLowerCase())
});

