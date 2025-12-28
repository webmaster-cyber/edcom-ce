import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import parse from "../utils/parse";

class DomainGroup extends Component {
  validateForm() {
    var p = this.props.data;
    return p.name.length > 0 && p.domains.length > 0;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}})
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.handleSave();

    this.goBack();
  }

  handleSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    var p = parse(this);

    if (p.returnto)
      this.props.history.push(p.returnto);
    else
      this.props.history.push("/domaingroups");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="domain-group-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Postal Routes', 'Saved Domain Group', 'Saved a Domain Group');
          return this.handleSubmit(e);
        }}
        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('Postal Routes', 'Saved Domain Group', 'Saved a Domain Group');
              return this.handleSave();
            }
          },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={this.props.id === 'new'?'Add Contact List Domains':'Edit Contact List Domains'} isSaving={this.props.isSaving}
          disabled={!this.validateForm()} onBack={this.goBack} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <FormControlLabel
                id="domains"
                label="Send only to these contact list domains and BLOCK/DENY all others"
                obj={this.props.data}
                componentClass="textarea"
                rows="6"
                onChange={this.handleChange}
                help="Example: gmail.com, yahoo.com, etc."
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
  extend: DomainGroup,
  initial: { name: '', domains: '' },
  get: async ({id}) => (await axios.get('/api/domaingroups/' + id)).data,
  post: ({data}) => axios.post('/api/domaingroups', data),
  patch: ({id, data}) => axios.patch('/api/domaingroups/' + id, data)
});
