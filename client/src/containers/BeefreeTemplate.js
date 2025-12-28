import React, { Component } from "react";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import { FormControlLabel, CheckboxLabel } from "../components/FormControls";
import TemplateBeefreeEditor from "../components/TemplateBeefreeEditor";
import { FormGroup } from "react-bootstrap";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";
import getvalue from "../utils/getvalue";

class BeefreeTemplate extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this._saveCB = null;
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    if (this._saveCB) {
      await this._saveCB();
    }

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push('/beefreetemplates');
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
        <SaveNavbar title="Edit Gallery Template" user={this.props.user} buttons={this.navbarButtons()}
          isSaving={this.props.isSaving} onBack={this.goBack} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef} nobottomspace={true}>
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
            <FormGroup className="space20 nobottomspace">
              <TemplateBeefreeEditor data={this.props.data} update={this.props.update}
                  onChange={() => {}}
                  nospace
                  transactional={true}
                  disableSavedRows={true}
                  setSaveCB={cb => this._saveCB = cb}
                  fields={this.props.allfields}
                  user={this.props.user} />
            </FormGroup>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: BeefreeTemplate,
  initial: {
    name: '',
    show: false,
    order: 0,
    parts: [],
    bodyStyle: {},
    initialize: false,
    type: 'beefree',
    rawText: JSON.stringify({html: '', json: {}}),
  },
  get: async ({id}) => (await axios.get('/api/beefreetemplates/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/beefreetemplates/' + id, data),
  post: ({data}) => axios.post('/api/beefreetemplates', data),
});
