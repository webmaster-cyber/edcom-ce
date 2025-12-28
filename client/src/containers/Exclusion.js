import React, { Component } from "react";
import { MenuItem, Nav, NavItem, Row, Col } from "react-bootstrap";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import ConfirmDropdown from "../components/ConfirmDropdown";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDCardsContainer, EDCard, EDTabs } from "../components/EDDOM";

import './Exclusion.css';

class Exclusion extends Component {
  switchView = () => {
    this.props.history.push("/suppression");
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  addClicked = l => {
    this.props.history.push("/exclusion/add?id=" + l.id + '&name=' + encodeURIComponent(l.name) + '&type=' + l.type);
  }

  render() {
    return (
      <div className="exclusion-container">
        <MenuNavbar {...this.props}>
          <TitlePage title="Exclusion Lists" tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView}>Suppression Lists</NavItem>
                <NavItem eventKey="2" disabled>Exclusion Lists</NavItem>
              </Nav>
            </EDTabs>
          }/>
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDCardsContainer>
              <p style={{flexBasis: '100%'}}>
                Adding contacts to an exclusion list immediately removes them from all contact lists and permanently blocks them from being added to the platform in the future.
              </p>
              {this.props.data.map(l => (
                <EDCard key={l.id} header={
                  <div>
                    <span className="pre-title">EXCLUSION</span>
                    <h3 className="list-name">
                      {l.name}
                    </h3>
                  </div>
                }>
                  <Row>
                    <Col xs={12} className="text-center">
                      <div className="circle">
                        <div className="content">
                          <span className="count">{this.num(l.count)}</span>
                          <span className="caption">COUNT</span>
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} className="text-center space25">
                      <ConfirmDropdown
                        id={l.id + '-split'}
                        title="Actions"
                        text="Actions">
                        <MenuItem onClick={this.addClicked.bind(null, l)}>{l.type === 'emails' ? 'Add Emails' : 'Add Domains'}</MenuItem>
                      </ConfirmDropdown>
                    </Col>
                  </Row>
                </EDCard>
              ))}
            </EDCardsContainer>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Exclusion,
  initial: [],
  get: async () => (await axios.get('/api/exclusion')).data,
});
