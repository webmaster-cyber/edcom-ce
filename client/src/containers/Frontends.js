import React, { Component } from "react";
import { Button, MenuItem, Nav, NavItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow, EDTabs } from "../components/EDDOM";

class Frontends extends Component {
  createClicked = () => {
    this.props.history.push("/frontends/edit?id=new"); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/frontends/' + id);
    await this.props.reload();
  }

  switchView = url => {
    this.props.history.push(url);
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="Advanced Frontend Configuration" button={
          <Button bsStyle="primary" onClick={this.createClicked}>Add New Configuration</Button>
        } tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="1">
              <NavItem eventKey="1" disabled>Frontend Configurations</NavItem>
              <NavItem eventKey="2" onClick={this.switchView.bind(null, "/beefreetemplates")}>Template Gallery</NavItem>
              <NavItem eventKey="3" onClick={this.switchView.bind(null, "/gallerytemplates")}>Template Gallery (Legacy)</NavItem>
              <NavItem eventKey="4" onClick={this.switchView.bind(null, "/formtemplates")}>Form Templates</NavItem>
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
                              <Link to={'/frontends/edit?id=' + f.id}>
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
                            extra={true}
                            title="Delete Confirmation"
                            prompt={"Are you sure you wish to delete '" + f.name + "'?"}
                            onConfirm={this.deleteConfirmClicked.bind(this, f.id)}
                            text="Actions">
                            <MenuItem onClick={() => this.props.history.push('/frontends/edit?id=' + f.id)}>Edit</MenuItem>
                          </ConfirmDropdown>
                       </td>
                     </EDTableRow>
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h3>No frontends configured!</h3>
                <h4>Frontends are what your customers see when they log in to EmailDelivery.com</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Frontends,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/frontends')).data, f => f.name.toLowerCase())
});

