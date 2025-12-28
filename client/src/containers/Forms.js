import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, MenuItem, Row, Col } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDCardsContainer, EDCard } from "../components/EDDOM";
import ConfirmDropdown from "../components/ConfirmDropdown";

import "./Forms.css";
/* eslint import/no-webpack-loader-syntax: off */
import FormIcon from '-!svg-react-loader!../svg/menu-icons/frontend-navigation-forms.svg';

class Forms extends Component {
  createClicked = () => {
    this.props.history.push("/forms/new?id=new"); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/forms/' + id);
    await this.props.reload();
  }

  duplicateClicked = async id => {
    await axios.post('/api/forms/' + id + '/duplicate');
    await this.props.reload();
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Forms" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Create Form</Button>
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
                      <span className="pre-title">FORM</span>
                      <h3 className="draft-name">
                        <Link to={'/forms/edit?id=' + t.id}>
                          {t.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <FormIcon className="message-icon"/>
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={t.id + '-split'}
                          text="Actions"
                          menu="Delete"
                          title="Delete Form Confirmation"
                          prompt={"Are you sure you wish to delete '" + t.name + "'? This action is permanent."}
                          onConfirm={this.deleteConfirmClicked.bind(this, t.id)}>
                          <MenuItem onClick={() => this.props.history.push('/forms/edit?id=' + t.id)}>Edit</MenuItem>
                          <MenuItem onClick={() => this.props.history.push('/forms/name?id=' + t.id)}>Change Name</MenuItem>
                          <MenuItem onClick={this.duplicateClicked.bind(this, t.id)}>Duplicate</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>You don&apos;t have any forms!</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Forms,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/forms')).data, t => t.name.toLowerCase()),
});
