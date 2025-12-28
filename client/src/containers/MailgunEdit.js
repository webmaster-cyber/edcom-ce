import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import { getHost } from "../utils/webroot";

const regions = [{
  id: 'eu',
  name: 'Mailgun EU'
}];

class MailgunEdit extends Component {
  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    var id = (await this.props.save()).data.id;

    if (isclose) {
      this.goBack();
    } else {
      this.props.history.replace("/mailgun/edit?id=" + id);
    }
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/mailgun");
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
          sendGA4Event('Connections', 'Mailgun', 'Saved Mailgun Configuration');
          return this.props.formSubmit(true);
        }}
        splitItems={[
          { text: 'Save', onClick: () => { sendGA4Event('Connections', 'Mailgun', 'Saved Mailgun Configuration'); return this.props.formSubmit(); } },

          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `${this.props.id === 'new'?'Add Mailgun Account':`Edit Mailgun Account ${dataName ? `for "${dataName}"` : ''}`}`;

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
                id="apikey"
                label="API Key"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                type="password"
                space
              />
              <FormControlLabel
                id="domain"
                label="Authenticated Sending Domain (Must match exactly, including subdomains)"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <SelectLabel
                id="region"
                label="Region"
                obj={this.props.data}
                onChange={this.handleChange}
                options={regions}
                emptyVal="Mailgun US"
                help="Select Mailgun EU if your Mailgun account is in the EU region"
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
  extend: MailgunEdit,
  initial: { name: '', apikey: '', domain: '', region: '', linkdomain: '', domaintarget: false },
  get: async ({id}) => (await axios.get('/api/mailgun/' + id)).data,
  post: ({data}) => axios.post('/api/mailgun', data),
  patch: ({id, data}) => axios.patch('/api/mailgun/' + id, data),
});
