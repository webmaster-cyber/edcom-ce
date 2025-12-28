import React, { Component } from "react";
import { FormGroup, ControlLabel, FormControl, Nav, NavItem, HelpBlock } from "react-bootstrap";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import { EDTabs } from "../components/EDDOM";
import axios from "axios";
import ConfirmButton from "../components/ConfirmButton";
import { getHost } from "../utils/webroot";
import { Link } from "react-router-dom";

import "./Connect.css";

export default class ConnectSMTP extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isResetting: false,
    };
  }

  resetKey = async () => {
    this.setState({isResetting: true});

    try {
      await axios.post('/api/reset/apikey');

      this.props.reloadUser();
    } finally {
      this.setState({isResetting: false});
    }
  }

  switchView = url => {
    this.props.history.push(url);
  }

  render() {
    var smtphost = this.props.user.smtphost || getHost(this.props);

    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="SMTP Relay"
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/connect')}>Sending API</NavItem>
                <NavItem eventKey="2" disabled>SMTP Relay</NavItem>
              </Nav>
            </EDTabs>
          }
        />
        <div className="Login">
          <div className="api-box" style={{ textAlign: 'center' }}>
            <h4>SMTP Relay is used for sending transactional messages.</h4><br></br>
            <p>Manage your transactional mail and view real-time logging <Link to="/transactional/settings">here</Link>.</p>
            <p>Authenticate using your API Key for the username and password. </p>
            <p>Note: the free version of Cloudflare proxy does not support SMTP via the proxied domain.</p><br></br>
          </div>
          <form className="space20" style={{ textAlign: 'center' }}>
            <FormGroup bsSize="large">
              <ControlLabel>SMTP Host</ControlLabel>
              <FormControl
                value={smtphost}
                readOnly={true}
              />
            </FormGroup>
            <FormGroup bsSize="large">
              <ControlLabel>Port</ControlLabel>
              <FormControl
                value="587 or 2525 or 8025"
                readOnly={true}
              />
            </FormGroup>
            <FormGroup bsSize="large">
              <ControlLabel>API Key</ControlLabel>
              <FormControl
                value={(this.props.user && !this.props.user.admin) ? this.props.user.apikey : ''}
                readOnly={true}
              />
              {(this.props.user && this.props.user.admin) && <HelpBlock>Login as a frontend user to reveal the API Key</HelpBlock>}
            </FormGroup>
            <ConfirmButton
              block
              style={{width: '100%'}}
              disabled={this.state.isResetting || (this.props.user && this.props.user.admin)}
              bsSize="large"
              text="Reset"
              title="Reset API Key"
              prompt="Are you sure you wish to reset your API Key? Any applications using the old key will need to be reconfigured with the new one."
              onConfirm={this.resetKey}
            />
            
          </form>
        </div>
      </MenuNavbar>
    );
  }
}
