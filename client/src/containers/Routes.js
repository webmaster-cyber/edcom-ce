import React, { Component } from "react";
import { MenuItem, Button, Nav, NavItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow, EDTabs } from "../components/EDDOM";

class Routes extends Component {
  createClicked = async () => {
    this.props.history.push("/routes/edit?id=new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/routes/' + id);
    await this.props.reload();
  }

  duplicate = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/routes/' + id + '/duplicate');
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  revert = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/routes/' + id + '/revert');

      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  publish = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/routes/' + id + '/publish');

      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  switchView = () => {
    this.props.history.push("/domaingroups");
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <div className="routes">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Postal Routes" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Create Postal Route</Button>
          } tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="1">
                <NavItem eventKey="1" disabled>Postal Routes</NavItem>
                <NavItem eventKey="2" onClick={this.switchView}>Contact List Domains</NavItem>
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
                      <th>Status</th>
                      <th>Default</th>
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(this.props.data, (b, index) =>
                      <EDTableRow key={b.id} index={index}>
                        <td>
                          <ul className="list-inline">
                            <li>
                              <h4 className="name-padded">
                                <Link to={'/routes/edit?id=' + b.id}>
                                  {b.name}
                                </Link>
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td>
                          {
                            b.dirty ?
                              <span style={{whiteSpace:'nowrap'}}><img src="/img/error.png" alt="" /> Unpublished Changes</span>
                            :
                              <span style={{whiteSpace:'nowrap'}}><img src="/img/like.png" alt="" /> Published</span>
                          }
                        </td>
                        <td>
                          {
                            b.usedefault && !b.dirty && <span style={{whiteSpace:'nowrap'}}><img src="/img/like.png" alt="" /></span>
                          }
                        </td>
                        <td className="last-cell">
                          <ConfirmDropdown
                            id={b.id + '-split'}
                            menu="Delete"
                            extra={true}
                            title="Delete Confirmation"
                            prompt={"Are you sure you wish to delete '" + b.name + "'?"}
                            onConfirm={this.deleteConfirmClicked.bind(this, b.id)}
                            text="Actions">
                            { b.dirty &&
                                <MenuItem onClick={this.publish.bind(this, b.id)}>Publish</MenuItem>
                            }
                            { b.dirty && b.published &&
                                <MenuItem onClick={this.revert.bind(this, b.id)}>Revert</MenuItem>
                            }
                            <MenuItem onClick={this.duplicate.bind(this, b.id)}>Duplicate</MenuItem>
                          </ConfirmDropdown>
                        </td>
                      </EDTableRow>
                    )
                  }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  <h4>No postal routes configured!</h4>
                </div>
            }
            </EDTableSection>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Routes,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/routes')).data, b => b.name.toLowerCase()),
});
