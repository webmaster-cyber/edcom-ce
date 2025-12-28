import React, { Component } from "react";
import SaveNavbar from "../components/SaveNavbar";
import axios from "axios";
import NewForm from "../components/NewForm";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import getvalue from "../utils/getvalue";
import _ from "underscore";

class FormNew extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
      isDisabled: false,
      isSubmitting: false,
    };

    this._submitcb = null;
  }

  setIsSaving = v => {
    this.setState({isSaving: v});
  }

  setSubmitCB = cb => {
    this._submitcb = cb;
  }

  goBack = () => {
    this.props.history.push("/forms");
  }

  cancelSubmit = () => {
    this.setState({isSubmitting: false});
  }

  finishSubmit = async (initialize, campType, htmltext, parts, bodyStyle, template, mobile) => {
    this.setState({isSubmitting: false});

    var p = {
      initialize: initialize,
      type: campType,
      rawText: htmltext,
      parts: parts,
      bodyStyle: bodyStyle,
    };

    if (template) {
      _.extend(p, {
        display: template.display,
        modallocation: template.modallocation,
        inlinelocation: template.inlinelocation,
        slidelocation: template.slidelocation,
        hellolocation: template.hellolocation,
      });
    }

    if (mobile) {
      p.mobile = mobile;
    }

    var id = (await this.props.save(p)).id;

    this.props.history.push("/forms/edit?id=" + id);
  }

  wizardNavbarButtons = () => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Design Your Form"
        loadingText="Saving..."
        className="green"
        onClick={() => this.props.formSubmit(true) }
        splitItems={[
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  validateForm() {
    return this.props.data.name;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  handleSubmit = async event => {
    event.preventDefault();
 
    if (!this.validateForm()) {
      return;
    }

    this.setState({isSubmitting: true});
    this._submitcb(event);
  }

  render() {
    return (
      <SaveNavbar title="Create New Form" isSaving={this.state.isSaving} onBack={this.goBack}
                  disabled={this.state.isDisabled} user={this.props.user} buttons={this.wizardNavbarButtons()}>
        <EDFormSection onSubmit={this.handleSubmit} className="space-top" formRef={this.props.formRef}>
          <EDFormBox border>
            <FormControlLabel
              id="name"
              label="Form Name"
              obj={this.props.data}
              onChange={this.handleChange}
              required={true}
            />
          </EDFormBox>
          <EDFormBox space>
            <div className="form_style">
              <SelectLabel
                id="list"
                label="Where do you want to save contacts who submit this form?"
                obj={this.props.data}
                onChange={this.handleChange}
                options={this.props.lists || []}
                emptyVal="Create a New Contact List"
                help={
                  this.props.data.list ? undefined : 'Your new contact list will have the same name as your form'
                }
              />
            </div>
          </EDFormBox>
          <NewForm setIsSaving={this.setIsSaving} onCancel={this.cancelSubmit}
                   isSaving={this.state.isSaving || this.props.isSaving}
                   setSubmitCB={this.setSubmitCB} finishSubmit={this.finishSubmit} />
        </EDFormSection>
      </SaveNavbar>
    );
  }
}

export default withLoadSave({
  initial: {
    name: '',
    tags: [],
    display: 'slide',
    modallocation: '',
    inlinelocation: '',
    slidelocation: 'bottom-right',
    hellolocation: 'top',
    mobile: {
      display: 'slide',
      modallocation: '',
      inlinelocation: '',
      slidelocation: 'bottom-right',
      hellolocation: 'top',
    },
    list: '',
    funnel: '',
    submitaction: 'msg',
    submitmsg: 'Thank you for subscribing!',
    submiturl: '',
    showdelaysecs: 0,
    showwhen: '',
    hideaftersubmit: true,
    returnaftersubmit: false,
    returnaftersubmitdays: 3,
    hideaftershow: false,
    returnaftershow: false,
    returnaftershowdays: 1,
  },
  extend: FormNew,
  post: async ({data}) => (await axios.post('/api/forms', data)).data,
  extra: {
    lists: async () => _.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()),
  }
});
