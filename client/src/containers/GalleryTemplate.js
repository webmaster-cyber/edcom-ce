import React, { Component } from "react";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import { FormControlLabel, CheckboxLabel } from "../components/FormControls";
import TemplateEditor from "../components/TemplateEditor";
import { FormGroup } from "react-bootstrap";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";
import getvalue from "../utils/getvalue";

class GalleryTemplate extends Component {
  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push('/gallerytemplates');
  }

  onChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="template-buttons-dropdown"
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
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar title="Edit Broadcast Template" user={this.props.user} buttons={this.navbarButtons()}
          isSaving={this.props.isSaving} onBack={this.goBack} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.onChange}
                required={true}
              />
              <CheckboxLabel
                id="show"
                label="Show on Frontend"
                obj={this.props.data}
                onChange={this.onChange}
              />
              <FormControlLabel
                id="order"
                label="Display Order Number"
                obj={this.props.data}
                onChange={this.onChange}
                type="number"
                style={{width: '75px'}}
              />
            </EDFormBox>
            <FormGroup className="space20">
              <TemplateEditor user={this.props.user} data={this.props.data} update={this.props.update} />
            </FormGroup>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: GalleryTemplate,
  initial: {
    name: '',
    show: false,
    order: 0,
    parts: [],
    bodyStyle: {version: 3},
    initialize: false,
    type: '',
    rawText: '',
  },
  get: async ({id}) => (await axios.get('/api/gallerytemplates/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/gallerytemplates/' + id, data),
  post: ({data}) => axios.post('/api/gallerytemplates', data),
});
