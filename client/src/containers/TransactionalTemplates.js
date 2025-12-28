import React, { Component } from "react";
import { Link } from "react-router-dom";
import { SplitButton, MenuItem, Nav, NavItem, Row, Col } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import LoaderButton from "../components/LoaderButton";
import { EDTableSection, EDTabs, EDCardsContainer, EDCard } from "../components/EDDOM";
import ConfirmDropdown from "../components/ConfirmDropdown";

import "./TransactionalTemplates.css";
/* eslint import/no-webpack-loader-syntax: off */
import MessageIcon from '-!svg-react-loader!../svg/menu-icons/frontend-navigation-messages.svg';

class TransactionalTemplates extends Component {
  switchView = url => {
    this.props.history.push(url);
  }

  createClicked = () => {
    this.props.history.push("/transactional/templates/new");
  }
  createLegacyClicked = () => {
    this.props.history.push("/transactional/templates/new?legacy=true"); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/transactional/templates/' + id);
    await this.props.reload();
  }

  duplicateClicked = async id => {
    await axios.post('/api/transactional/templates/' + id + '/duplicate');
    await this.props.reload();
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Transactional Templates" button={
            this.props.user.hasbeefree ?
              <SplitButton id="create"
                title="Create Template"
                onClick={this.createClicked}
                bsStyle="primary">
                {
                  <MenuItem onClick={this.createLegacyClicked}>Create Template (Legacy Editor)</MenuItem>
                }
              </SplitButton>
            :
              <LoaderButton id="create"
                            bsStyle="primary"
                            onClick={this.createLegacyClicked}
                            text="Create Template"
                            className="btn-primary"/>
          }
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/transactional')}>Dashboard</NavItem>
                <NavItem eventKey="2" disabled>Templates</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, '/transactional/log')}>Log</NavItem>
                <NavItem eventKey="4" onClick={this.switchView.bind(null, '/transactional/settings')}>Settings</NavItem>
              </Nav>
            </EDTabs>
          }
        />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection className="templates">
          {
            this.props.data.length ?
              <EDCardsContainer>
                {_.map(this.props.data, (t, index) => (
                  <EDCard key={t.id} header={
                    <div>
                      <span className="pre-title">TEMPLATE</span>
                      <h3 className="draft-name">
                        <Link to={'/transactional/templates/edit?id=' + t.id}>
                          {t.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <MessageIcon className="message-icon"/>
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={t.id + '-split'}
                          text="Actions"
                          menu="Delete"
                          title="Delete Template Confirmation"
                          prompt={"Are you sure you wish to delete '" + t.name + "'? This action is permanent."}
                          onConfirm={this.deleteConfirmClicked.bind(this, t.id)}>
                          <MenuItem onClick={() => this.props.history.push('/transactional/templates/edit?id=' + t.id)}>Edit</MenuItem>
                          <MenuItem onClick={this.duplicateClicked.bind(this, t.id)}>Duplicate</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>You don&apos;t have any templates!</h4>
                <h5>Templates let you easily reuse content for multiple transactional messages.</h5>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: TransactionalTemplates,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/transactional/templates')).data, t => t.name.toLowerCase()),
});
