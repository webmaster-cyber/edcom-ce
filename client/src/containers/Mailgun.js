import React, { Component } from "react";
import { Button, Row, Col, MenuItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDCardsContainer, EDCard } from "../components/EDDOM";

import './Servers.css';
/* eslint import/no-webpack-loader-syntax: off */
import MailgunIcon from '-!svg-react-loader!../svg/menu-icons/backend-dropdown-menu-mailgun.svg';

class Mailgun extends Component {
  createClicked = () => {
    this.props.history.push("/mailgun/edit?id=new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/mailgun/' + id);
    await this.props.reload();
  }

  render() {
    return (
      <div className="servers">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Mailgun Accounts" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Add Mailgun Account</Button>
          } />
          <LoaderPanel isLoading={this.props.isLoading}>
            {this.props.data.length ?
              <EDCardsContainer>
                {this.props.data.map(s => (
                  <EDCard key={s.id} header={
                    <div>
                      <span className="pre-title">ACCOUNT</span>
                      <h3 className="server-name">
                        <Link to={'/mailgun/edit?id=' + s.id}>
                          {s.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <MailgunIcon className="mailgun mailgun-icon" />
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={s.id + '-split'}
                          menu="Delete"
                          title="Delete Confirmation"
                          extra={true}
                          prompt={"Are you sure you wish to delete '" + s.name + "'?"}
                          onConfirm={this.deleteConfirmClicked.bind(this, s.id)}
                          text="Actions">
                          <MenuItem onClick={() => this.props.history.push('/mailgun/edit?id=' + s.id)}>Edit</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>No Mailgun accounts configured!</h4>
              </div>
            }
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Mailgun,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/mailgun')).data, s => s.name.toLowerCase())
});
