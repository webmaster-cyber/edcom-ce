import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";

class SuppressionEdit extends Component {
  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}})
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push("/suppression");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="supp-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={this.props.formSubmit.bind(null, true)}
        splitItems={[
          { text: 'Save', onClick: this.props.formSubmit },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    return (
      <SaveNavbar onBack={this.goBack} buttons={this.navbarButtons()}
                  title={'Edit Suppression List'} id={this.props.id} user={this.props.user}
                  isSaving={this.props.isSaving}>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
              />
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </SaveNavbar>
    );
  }
}

export default withLoadSave({
  extend: SuppressionEdit,
  initial: { name: '' },
  get: async ({id}) => (await axios.get('/api/supplists/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/supplists/' + id, data),
});
