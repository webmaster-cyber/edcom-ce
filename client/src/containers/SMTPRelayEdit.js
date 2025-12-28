import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel, SelectLabel, CheckboxLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import { getHost } from "../utils/webroot";

const ssltypes = [
  {
    id: 'none',
    name: 'None'
  },
  {
    id: 'ssl',
    name: 'SSL'
  },
  {
    id: 'starttls',
    name: 'STARTTLS'
  }
];

class SMTPRelayEdit extends Component {
  handleChange = event => {
    const val = getvalue(event);

    const upd = {
      [event.target.id]: {$set: val}
    };

    if (event.target.id === 'ssltype' && val === 'ssl' && this.props.data.port === 25) {
      upd.port = {$set: 465};
    } else if (event.target.id === 'ssltype' && val !== 'ssl' && this.props.data.port === 465) {
      upd.port = {$set: 25};
    }
    this.props.update(upd);
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    var id = (await this.props.save()).data.id;

    if (isclose) {
      this.goBack();
    } else {
      this.props.history.replace("/smtprelays/edit?id=" + id);
    }
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/smtprelays");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="server-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={() => {
          sendGA4Event('Connections', 'Saved SMTPRelay', 'Saved an SMTPRelay Configuration');
          return this.props.formSubmit(true);
        }}
        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('Connections', 'Saved SMTPRelay', 'Saved an SMTPRelay Configuration');
              return this.props.formSubmit();
            }
          },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `${this.props.id === 'new'?'Add SMTP Relay':`Edit SMTP Relay ${dataName ? `for "${dataName}"` : ''}`}`;

    const host = getHost(this.props);

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={title} onBack={this.goBack} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
              />
              <FormControlLabel
                id="hostname"
                label="Hostname"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <FormControlLabel
                id="ehlohostname"
                label="HELO/EHLO Local Hostname"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <CheckboxLabel
                id="useauth"
                label="Use Authentication"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <FormControlLabel
                id="username"
                label="Username"
                obj={this.props.data}
                onChange={this.handleChange}
                disabled={!this.props.data.useauth}
                space
              />
              <FormControlLabel
                id="password"
                label="Password"
                obj={this.props.data}
                onChange={this.handleChange}
                type="password"
                disabled={!this.props.data.useauth}
                space
              />
              <SelectLabel
                id="ssltype"
                label="SSL Type"
                obj={this.props.data}
                options={ssltypes}
                onChange={this.handleChange}
                space
              />
              <FormControlLabel
                id="port"
                label="Port"
                obj={this.props.data}
                onChange={this.handleChange}
                type="number"
                min="1"
                required={true}
                space
              />
              <FormControlLabel
                id="msgsperconn"
                label="Max. Messages Per Connection"
                obj={this.props.data}
                onChange={this.handleChange}
                type="number"
                min="1"
                space
              />
              <FormControlLabel
                id="headers"
                label="Additional Headers"
                obj={this.props.data}
                onChange={this.handleChange}
                componentClass="textarea"
                rows="4"
                space
              />
              <FormControlLabel
                id="linkdomain"
                label="White Label Your Tracking Links"
                help='This domain must be created in your DNS provider as an A record pointing to your platform IP. Example: links.domain.com'
                placeholder={host}
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <div className="text-center space15">
                View our <a style={{fontSize: 'inherit'}} href="https://docs.emaildelivery.com/docs/introduction/understanding-the-white-label-tracking-link" target="_blank" rel="noopener noreferrer">documentation</a> on white-labeled tracking
              </div>
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: SMTPRelayEdit,
  initial: { name: '', hostname: '', ehlohostname: '', useauth: false, username: '', password: '', ssltype: 'none', port: 25, msgsperconn: null, headers: '', linkdomain: '' },
  get: async ({id}) => (await axios.get('/api/smtprelays/' + id)).data,
  post: ({data}) => axios.post('/api/smtprelays', data),
  patch: ({id, data}) => axios.patch('/api/smtprelays/' + id, data),
});
