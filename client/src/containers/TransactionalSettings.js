import React, { Component } from "react";
import { Button, Nav, NavItem } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTabs, EDFormSection, EDFormBox, EDFormGroup } from "../components/EDDOM";
import { SelectLabel, CheckboxLabel } from "../components/FormControls";
import notify from "../utils/notify";
import { routesHelp } from "../utils/template-utils";
import Beforeunload from "react-beforeunload"
import getvalue from "../utils/getvalue";
import { Prompt } from "react-router-dom";

class TransactionalSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      changed: false,
    };
  }

  switchView = url => {
    this.props.history.push(url);
  }

  saveClicked = async () => {
    await axios.patch('/api/transactional/settings', this.props.data);

    this.setState({changed: false}, () => {
      notify.show("Settings saved", "success");
    });
  }

  handleChange = event => {
    var id = event.target.id;
    var val = getvalue(event);
    this.setState({changed: true});
    this.props.update({[id]: {$set: val}});
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Transactional Settings" button={
            <Button bsStyle="primary" onClick={this.saveClicked}>Save Settings</Button>
          }
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="4">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/transactional')}>Dashboard</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/transactional/templates')}>Templates</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, '/transactional/log')}>Log</NavItem>
                <NavItem eventKey="4" disabled>Settings</NavItem>
              </Nav>
            </EDTabs>
          }
        />
        <LoaderPanel isLoading={this.props.isLoading}>
          {this.state.changed &&
            <Beforeunload onBeforeunload={() => "Are you sure you want to exit without saving?"} />
          }
          <Prompt when={this.state.changed} message="Are you sure you want to exit without saving?" />
          <EDFormSection>
            <EDFormBox>
              <EDFormGroup>
                { !this.props.routes
                  ?
                    null
                  :
                    <SelectLabel
                      id="route"
                      label="Default Postal Route For Transactional Messages:"
                      obj={this.props.data}
                      onChange={this.handleChange}
                      options={this.props.routes}
                      help={routesHelp(this.props.routes)}
                    />
                }
                <CheckboxLabel
                  id="disableopens"
                  label="Disable open tracking"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  space={!!this.props.routes}
                />
              </EDFormGroup>
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: TransactionalSettings,
  initial: {},
  get: async () => (await axios.get('/api/transactional/settings')).data,
  extra: {
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
  },
});
