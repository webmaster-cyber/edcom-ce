import React, { Component } from "react";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import WizardNavbar from "../components/WizardNavbar";
import PolicyProgress from "../components/PolicyProgress";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import ScrollToTop from "../components/ScrollToTop";

class PolicyDomains extends Component {
  validateForm() {
    return this.props.data.name;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  onSave = async () => {
    await this.props.save();
  }

  onSaveExit = async () => {
    await this.onSave();

    this.onExit();
  }

  onExit = async () => {
    this.props.history.push('/policies');
  }

  onNext = async event => {
    event.preventDefault();

    await this.onSave();

    this.props.history.push('/policies/settings?id=' + this.props.id);
  }

  onLinkClick = async url => {
    await this.props.save();

    this.props.history.push(url);
  }

  wizardNavbarButtons = () => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Save and Continue"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={this.onNext}
        splitItems={[
          { text: 'Save', onClick: this.onSave },
          { text: 'Save and Exit', onClick: this.onSaveExit },
          { text: 'Exit Without Saving', onClick: this.onExit }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <WizardNavbar isAdmin={true} isSaving={this.props.isSaving} user={this.props.user} brandText="Policy Editor"
          link="/policies"
          disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()}/>
        <EDFormSection onSubmit={this.onNext}>
          <PolicyProgress active={1} id={this.props.id} disabled={this.props.id === 'new'} onClick={this.onLinkClick} />
          <EDFormBox>
            <FormControlLabel
              id="name"
              label="Name"
              obj={this.props.data}
              onChange={this.handleChange}
            />
          </EDFormBox>
          <EDFormBox space>
            <FormControlLabel
              id="domains"
              label="Policy Filter — Expert use only, do not modify"
              obj={this.props.data}
              componentClass="textarea"
              rows="6"
              onChange={this.handleChange}
              help="Modifying this will cause all mail sent to any other domain which is not explicitly included to become BLOCKED/DENIED"
              space
            />
          </EDFormBox>
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: PolicyDomains,
  initial: [],
  get: async ({id}) => (await axios.get('/api/policies/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/policies/' + id, data),
});
