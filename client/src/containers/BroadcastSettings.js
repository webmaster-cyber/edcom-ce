import React, { Component } from "react";
import BroadcastNavbar from "../components/BroadcastNavbar";
import axios from "axios";
import NewTemplate from "../components/NewTemplate";
import TemplateHeader from "../components/TemplateHeader";
import { FormControlLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import WizardProgress from "../components/WizardProgress";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import _ from "underscore";
import ScrollToTop from "../components/ScrollToTop";

class BroadcastSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
      submitCB: null,
      nextURL: null,
      isSubmitting: false,
      legacyEditor: false,
    };
  }

  onLinkClick = async url => {
    this.setState({nextURL: url}, () => {
      this.props.formSubmit(true);
    });
  }

  setIsSaving = v => {
    this.setState({isSaving: v});
  }

  validateForm = () => {
    return !this.state.isSaving;
  }

  setSubmitCB = cb => {
    this.setState({submitCB: cb});
  }

  onExit = () => {
    this.props.history.push("/broadcasts");
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}});
  }

  doSave = async (p) => {
    if (!p) {
      p = {};
    }

    if (this.props.id === 'new') {
      var lists = (await axios.get('/api/lists/')).data;

      var example = _.find(lists, l => l.example);

      if (example) {
        p.lists = [example.id];
      }
    }

    return this.props.save(p);
  }

  handleSubmit = async event => {
    event.preventDefault();
 
    if (!this.validateForm()) {
      return;
    }

    const ro = !!this.props.data.sent_at;

    if (this.props.id === 'new') {
      this.setState({isSubmitting: true});
      this.state.submitCB(event, this.state.legacyEditor || !this.props.user.hasbeefree);
    } else {
      event.preventDefault();

      if (!ro) {
        await this.doSave();
      }

      if (this.state.nextURL) {
        this.props.history.push(this.state.nextURL);
      } else {
        this.props.history.push("/broadcasts/template?id=" + this.props.id);
      }
    }
  }

  cancelSubmit = () => {
    this.setState({isSubmitting: false});
  }

  finishSubmit = async (initialize, campType, htmltext, parts, bodyStyle) => {
    this.setState({isSubmitting: false});

    var id = (await this.doSave({
      initialize: initialize,
      type: campType,
      rawText: htmltext,
      parts: parts,
      bodyStyle: bodyStyle,
    })).id;

    if (this.state.nextURL) {
      var next = this.state.nextURL.replace(/\?id=.*/, "?id=" + id);
      this.props.history.push(next);
    } else {
      this.props.history.push("/broadcasts/template?id=" + id);
    }
  }

  wizardNavbarButtons = () => {
    const splitItems = [
      { text: 'Choose Recipients', onClick: () => { this.setState({nextURL: '/broadcasts/rcpt?id=' + this.props.id}, () => this.props.formSubmit(true)) } },
      { text: this.props.id === 'new'?'Cancel':'Exit', onClick: this.onExit }
    ];
    if (this.props.id === 'new' && this.props.user.hasbeefree) {
      splitItems.unshift({ text: 'Design Your Email (Legacy Editor)', onClick: () => { this.setState({legacyEditor: true}, () => this.props.formSubmit(true)) } });
    }
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Design Your Email"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm()}
        onClick={() => { this.setState({nextURL: null}, () => this.props.formSubmit(true)) } }
        splitItems={splitItems}
      />
    )
  }

  render() {
    const ro = !!this.props.data.sent_at;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <BroadcastNavbar isSaving={this.state.isSaving || this.props.isSaving} user={this.props.user}
          link="/broadcasts"
          disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()} />
        <EDFormSection onSubmit={this.handleSubmit} className="space-top" formRef={this.props.formRef}>
          <WizardProgress active={1} id={this.props.id} onClick={this.onLinkClick} />
          <EDFormBox border style={{display:this.state.isSubmitting?'none':undefined}}>
            <FormControlLabel
              id="name"
              label="Broadcast Name"
              obj={this.props.data}
              onChange={this.handleChange}
              readOnly={ro}
              required={true}
            />
          </EDFormBox>
          <EDFormBox space className="campaign_edit" style={{display:this.state.isSubmitting?'none':undefined}}>
            <TemplateHeader user={this.props.user} data={this.props.data} update={this.props.update} readOnly={ro} fields={this.props.allfields} />
          </EDFormBox>
          <div className={(this.props.id === 'new' && this.props.user.hasbeefree)?'split-design-btn':''}>
            <LoaderButton
              id="next-buttons-dropdown"
              style={{display:this.state.isSubmitting?'none':undefined}}
              isLoading={this.props.isSaving || this.state.isSaving}
              className="next action-button"
              text="Design Your Email"
              loadingText={this.state.isSaving?"Creating...":"Saving..."}
              disabled={!this.validateForm()}
              onClick={() => { this.setState({nextURL: null, legacyEditor: false}, () => this.props.formSubmit(true)) } }
              splitItems={
                (this.props.id === 'new' && this.props.user.hasbeefree) ? [
                { text: 'Design Your Email (Legacy Editor)', onClick: () => { this.setState({legacyEditor: true}, () => this.props.formSubmit(true)) } },
              ] : undefined}
            />
          </div>
          { this.props.id === 'new' &&
            <div>
              <NewTemplate setIsSaving={this.setIsSaving} onCancel={this.cancelSubmit}
                           isSaving={this.state.isSaving || this.props.isSaving}
                           user={this.props.user}
                           setSubmitCB={this.setSubmitCB} finishSubmit={this.finishSubmit} />
            </div>
          }
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  initial: {
    name: '',
    fromname: '',
    returnpath: '',
    fromemail: '',
    replyto: '',
    subject: '',
    preheader: '',
    parts: [],
    bodyStyle: {version: 3},
    lists: [],
    segments: [],
    supplists: [],
    tags: [],
    supptags: [],
    suppsegs: [],
    funnel: '',
    disableopens: false,
    randomize: false,
    newestfirst: false,
    when: 'draft',
    scheduled_for: null,
    openaddtags: [],
    openremtags: [],
    clickaddtags: [],
    clickremtags: [],
    sendaddtags: [],
    sendremtags: [],
    resendwhennum: 2,
    resendwhentype: 'days',
    resendsubject: '',
    resendpreheader: '',
  },
  extend: BroadcastSettings,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  post: async ({data}) => (await axios.post('/api/broadcasts/', data)).data,
  patch: ({id, data}) => axios.patch('/api/broadcasts/' + id, data),
  extra: {
    allfields: async () => (await axios.get('/api/allfields')).data,
  }
});
