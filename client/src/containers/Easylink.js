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

class Easylink extends Component {
  createClicked = () => {
    this.props.history.push("/easylink/edit?id=new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/easylink/' + id);
    await this.props.reload();
  }

  render() {
    return (
      <div className="servers">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Easylink Accounts" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Add Easylink Account</Button>
          } />
          <LoaderPanel isLoading={this.props.isLoading}>
            {this.props.data.length ?
              <EDCardsContainer>
                {this.props.data.map(s => (
                  <EDCard key={s.id} header={
                    <div>
                      <span className="pre-title">ACCOUNT</span>
                      <h3 className="server-name">
                        <Link to={'/easylink/edit?id=' + s.id}>
                          {s.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        <img alt="" src="/img/easylink.png" className="easylink easylink-icon" />
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
                          <MenuItem onClick={() => this.props.history.push('/easylink/edit?id=' + s.id)}>Edit</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>No Easylink accounts configured!</h4>
              </div>
            }
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Easylink,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/easylink')).data, s => s.name.toLowerCase())
});
