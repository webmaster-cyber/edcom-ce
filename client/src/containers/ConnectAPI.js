import React, { Component } from "react";
import { FormGroup, ControlLabel, FormControl, Nav, NavItem, HelpBlock } from "react-bootstrap";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import { EDTabs } from "../components/EDDOM";
import axios from "axios";
import ConfirmButton from "../components/ConfirmButton";
import { getWebroot } from "../utils/webroot";

import "./Connect.css";

export default class ConnectAPI extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isResetting: false,
    };
  }

  switchView = url => {
    this.props.history.push(url);
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

  render() {

    var example = `curl -s -X POST ${getWebroot(this.props)}/api/transactional/send \\
-H 'Content-Type: application/json' \\
-H 'X-Auth-APIKey: ${(this.props.user && !this.props.user.admin) ? this.props.user.apikey : ''}' \\
-d '{
  "fromname": "Sender",
  "fromemail": "sender@domain.com",
  "to": "recipient@domain.com",
  "subject": "A message",
  "body": "<html><body>A test message</body></html>"
}'
`;
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Sending API"
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="1">
                <NavItem eventKey="1" disabled>Sending API</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/connect/smtp')}>SMTP Relay</NavItem>
              </Nav>
            </EDTabs>
          }
        />
        <div className="Login">
          <div className="api-box">
            <h4>Use our REST API to send transactional messages from any application:</h4>
            <pre className="code-box">
              {example}
            </pre>
          </div>
          <form className="space20">
            <FormGroup bsSize="large">
              <ControlLabel style={{textAlign: 'center'}}>API Key</ControlLabel>
              <FormControl
                value={(this.props.user && !this.props.user.admin) ? this.props.user.apikey : ''}
                readOnly={true}
                style={{textAlign: 'center'}}
              />
              {(this.props.user && this.props.user.admin) && <HelpBlock>Login as a frontend user to reveal the API Key.</HelpBlock>}
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
          <div className="api-box space20">
            <div className="space20 text-center api-link-box">
              <a target="_blank" href="/api/doc"><h4>View Our Full API Documentation</h4></a>
            </div>
          </div>
        </div>
      </MenuNavbar>
    );
  }
}
