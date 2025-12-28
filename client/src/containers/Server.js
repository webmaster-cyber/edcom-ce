import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox, EDTabs } from "../components/EDDOM";
import EDDataSheet from "../components/EDDataSheet";
import TitlePage from "../components/TitlePage";
import { Nav, NavItem } from "react-bootstrap";

class Server extends Component {
  constructor(props) {
    super(props);

    this.state = { activeKey: '1' };
  }

  switchView = v => {
    this.setState({activeKey: v});
  }

  validateForm() {
    const d = this.props.data;
    return d.name && d.url && d.accesskey;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}})
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/servers");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="server-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Servers', 'Saved Server Configuration', 'Saved a Server Configuration');
          return this.handleSubmit(e);
        }}

        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('Servers', 'Saved Server Configuration', 'Saved a Server Configuration');
              return this.onSave();
            }
          },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    );
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `${this.props.id === 'new'?'Add Server':`Edit Server ${dataName ? `for "${dataName}"` : ''}`}`;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={title} onBack={this.goBack} disabled={!this.validateForm()} buttons={this.navbarButtons()} id={this.props.id}>
          <TitlePage tabs={
            <EDTabs>
              <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Sending IP Configuration</NavItem>
                <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Connect MTA</NavItem>
              </Nav>
            </EDTabs>
          }/>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDFormBox style={{display:this.state.activeKey==='1'?'block':'none'}}>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
            </EDFormBox>
            <EDFormBox space style={{display:this.state.activeKey==='1'?'block':'none'}}>
              <EDDataSheet
                id="ipdata"
                label="Sending IPs and Domains"
                obj={this.props.data}
                onChange={this.handleChange}
                columns={[{display: 'IP', name: 'ip'},
                          {display: 'Header Domain', name: 'domain'},
                          {display: 'Link Domain', name: 'linkdomain'}]}
                widths={[140, undefined, undefined]}
                help="Click and type to enter data, or paste from a spreadsheet"
              />
            </EDFormBox>
            <EDFormBox style={{display:this.state.activeKey==='2'?'block':'none'}}>
              <FormControlLabel
                id="url"
                type="url"
                label="MTA Management IP"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <FormControlLabel
                id="accesskey"
                label="MTA Password"
                obj={this.props.data}
                type="password"
                onChange={this.handleChange}
                space
              />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: Server,
  initial: { name: '', url: '', accesskey: '', ipdata: [] },
  get: async ({id}) => (await axios.get('/api/sinks/' + id)).data,
  post: ({data}) => axios.post('/api/sinks', data),
  patch: ({id, data}) => axios.patch('/api/sinks/' + id, data),
});
