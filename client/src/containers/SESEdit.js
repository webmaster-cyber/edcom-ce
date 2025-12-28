import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import { getHost } from "../utils/webroot";

class SESEdit extends Component {
  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}})
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    var id = (await this.props.save()).data.id;

    if (isclose) {
      this.goBack();
    } else {
      this.props.history.replace("/ses/edit?id=" + id);
    }
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/ses");
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
          sendGA4Event('Connections', 'AmazonSES', 'Saved AmazonSES Configuration');
          return this.props.formSubmit(true);
        }}
        splitItems={[
          { text: 'Save', onClick: () => { sendGA4Event('Connections', 'AmazonSES', 'Saved AmazonSES Configuration'); return this.props.formSubmit(); } },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `${this.props.id === 'new'?'Add SES Account':`Edit SES Account ${dataName ? `for "${dataName}"` : ''}`}`;

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
                id="region"
                label="AWS Region"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <FormControlLabel
                id="access"
                label="AWS Access Key"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <FormControlLabel
                id="secret"
                label="Secret Key"
                obj={this.props.data}
                onChange={this.handleChange}
                type="password"
                required={true}
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
  extend: SESEdit,
  initial: { name: '', region: 'us-east-1', access: '', secret: '', domain: '', linkdomain: '' },
  get: async ({id}) => (await axios.get('/api/ses/' + id)).data,
  post: ({data}) => axios.post('/api/ses', data),
  patch: ({id, data}) => axios.patch('/api/ses/' + id, data),
});
