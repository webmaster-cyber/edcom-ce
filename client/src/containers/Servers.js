import React, { Component } from "react";
import { Button, Nav, NavItem, MenuItem, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDCardsContainer, EDCard, EDTabs } from "../components/EDDOM";

import './Servers.css';
/* eslint import/no-webpack-loader-syntax: off */
import ServerIcon from '-!svg-react-loader!../svg/menu-icons/backend-dropdown-menu-servers.svg';

class Servers extends Component {
  createClicked = () => {
    this.props.history.push("/servers/edit?id=new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/sinks/' + id);
    await this.props.reload();
  }

  switchView = () => {
    this.props.history.push("/dkim");
  }

  render() {
    return (
      <div className="servers">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Servers" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Add Server</Button>
          } tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="1">
                <NavItem eventKey="1" disabled>Servers</NavItem>
                <NavItem eventKey="2" onClick={this.switchView}>DKIM</NavItem>
              </Nav>
            </EDTabs>
          } />
          <LoaderPanel isLoading={this.props.isLoading}>
            {this.props.data.length ?
              <EDCardsContainer>
                {this.props.data.map(s => (
                  <EDCard key={s.id} header={
                    <div>
                      <span className="pre-title">SERVER</span>
                      <h3 className="server-name">
                        <Link to={'/servers/edit?id=' + s.id}>
                          {s.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <ServerIcon  className="server-icon"/>
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={s.id + '-split'}
                          menu="Delete"
                          extra={true}
                          title="Delete Confirmation"
                          prompt={"Are you sure you wish to delete '" + s.name + "'?"}
                          onConfirm={this.deleteConfirmClicked.bind(this, s.id)}
                          text="Actions">
                          <MenuItem onClick={() => this.props.history.push('/servers/edit?id=' + s.id)}>Edit</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>No servers configured!</h4>
              </div>
            }
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Servers,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/sinks')).data, s => s.name.toLowerCase())
});
