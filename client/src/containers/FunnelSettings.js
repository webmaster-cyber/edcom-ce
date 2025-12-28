import React, { Component } from "react";
import WizardNavbar from "../components/WizardNavbar";
import axios from "axios";
import NewTemplate from "../components/NewTemplate";
import TemplateHeader from "../components/TemplateHeader";
import { FormControlLabel, SelectLabel, CheckboxLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import FunnelProgress from "../components/FunnelProgress";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import _ from "underscore";
import Select2 from "react-select2-wrapper";
import newMessage from "../utils/new-message";
import ScrollToTop from "../components/ScrollToTop";
import { routesHelp } from "../utils/template-utils";
import fixTag from "../utils/fixtag";

import "react-select2-wrapper/css/select2.css";

class FunnelSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
      isDisabled: false,
      submitCB: null,
      legacyEditor: false,
    };
  }

  setIsSaving = v => {
    this.setState({isSaving: v});
  }

  cancelSubmit = () => {}

  validateForm = () => {
    return !this.state.isDisabled;
  }

  setSubmitCB = cb => {
    this.setState({submitCB: cb});
  }

  onExit = () => {
    this.props.history.push("/funnels");
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  handleSubmit = async event => {
    this.props.formClose(event);

    if (this.props.id === 'new') {
      this.state.submitCB(event, this.state.legacyEditor || !this.props.user.hasbeefree);
    } else {
      event.preventDefault();

      await this.props.save();

      this.props.history.push("/funnels/message?id=" + this.props.id);
    }
  }

  finishSubmit = async (initialize, campType, htmltext, parts, bodyStyle) => {
    if (this.props.id === 'new') {
      var id = (await this.props.save()).id;

      var msgid = (await axios.post('/api/messages', newMessage(id, initialize, campType, htmltext, parts, bodyStyle))).data.id;

      await axios.patch('/api/funnels/' + id, {
        messages: [{
          id: msgid,
          whennum: 0,
          whentype: 'mins',
          whentime: '',
          fromname: this.props.data.fromname,
          returnpath: this.props.data.returnpath,
          fromemail: this.props.data.fromemail,
          replyto: this.props.data.replyto,
        }],
      });

      this.props.history.push("/funnels/message?id=" + id);
    } else {
      await this.props.save();
      this.props.history.push("/funnels/message?id=" + id);
    }
  }

  addTag = (prop, event) => {
    if (!_.find(this.props.data[prop], t => t === event.params.data.id))
      this.props.update({[prop]: {$push: [event.params.data.id]}});
  }

  removeTag = (prop, index) => {
    const ro = !!this.props.data.sent_at;

    if (ro || this.state.calculating)
      return;

    this.props.update({[prop]: {$splice: [[index, 1]]}});
  }

  onClose = ref => {
    this.refs[ref].el.val('');
    this.refs[ref].el.trigger('change');
  }

  wizardNavbarButtons = () => {
    const splitItems = [
      { text: 'Exit', onClick: this.onExit }
    ];
    if (this.props.id === 'new' && this.props.user.hasbeefree) {
      splitItems.unshift({ text: 'Design Your Email (Legacy Editor)', onClick: () => { this.setState({legacyEditor: true}, () => this.props.formSubmit(true)) } });
    }
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Design Your Funnel"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={() => { this.setState({legacyEditor: false}, () => this.props.formSubmit(true)) }}
        splitItems={splitItems}
      />
    )
  }

  render() {
    var tagitems = _.map(_.filter(this.props.tags, l => !_.find(this.props.data.tags, id => id === l)), t => ({id: t, text: t}));
    var exittagitems = _.map(_.filter(this.props.tags, l => !_.find(this.props.data.exittags, id => id === l)), t => ({id: t, text: t}));

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <WizardNavbar isSaving={this.state.isSaving || this.props.isSaving} user={this.props.user}
          link="/funnels"
          disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()} />
        <EDFormSection onSubmit={this.handleSubmit} className="space-top" formRef={this.props.formRef}>
          <FunnelProgress active={1} id={this.props.id} onClick={this.props.formSubmit.bind(null, true)} disabled={!this.validateForm()} />
          <EDFormBox border>
            <FormControlLabel
              id="name"
              label="Funnel Name"
              obj={this.props.data}
              onChange={this.handleChange}
              required={true}
            />
          </EDFormBox>
          { this.props.id === 'new' &&
              <EDFormBox space>
                <h4>Choose Your Funnel Type</h4>
                <p className="blue-check checkbx-combo space30">
                  <input required={true} type="radio" id="type" name="radio-group" value="tags" checked={this.props.data.type==='tags'} onChange={this.handleChange} style={{zIndex: 999999, opacity: 0, cursor: 'pointer', width: '100%', height: '30px'}}/>
                  <label className="m0">
                    I want contacts to be sent through this funnel when they are assigned a tag
                  </label>
                </p>
                <p className="skyblue-check checkbx-combo space10">
                  <input required={true} type="radio" id="type" name="radio-group" value="responders" checked={this.props.data.type==='responders'} onChange={this.handleChange} style={{zIndex:999999, opacity: 0, cursor: 'pointer', width: '100%', height: '30px'}}/>
                  <label className="m0">
                    I want to send responders from a broadcast or form to this funnel
                  </label>
                </p>
              </EDFormBox>
          }
          {
            this.props.data.type === 'responders' &&
              <EDFormBox space>
                <p><span style={{fontSize:'28px'}} className="text-info fa fa-info-circle"/></p>
                <h5>To send contacts to this funnel, select it on the review page for a broadcast or the contacts tab for a form</h5>
              </EDFormBox>
          }
          {
            this.props.data.type === 'tags' &&
              <EDFormBox space>
                <div className="edit_txt" style={{fontSize:'12px', position: 'absolute', right: '30px', fontWeight: 600}}>
                  <Select2
                    data={tagitems}
                    value=""
                    onSelect={this.addTag.bind(null, 'tags')}
                    onClose={this.onClose.bind(null, 'addtags')}
                    ref="addtags"
                    style={{width:'180px'}}
                    options={{
                      placeholder: 'Add Tag',
                      tags: true,
                      createTag: function (params) {
                        const fixed = fixTag(params.term);
                        if (!fixed) {
                          return null;
                        }
                        return {
                          id: fixTag(params.term),
                          text: fixTag(params.term)
                        }
                      }
                    }}
                  />
                  <span style={{display:'none'}} />
                  {
                    (!this.props.data.tags || this.props.data.tags.length === 0) &&
                    <select multiple required={true} placeholder="ok" style={{width:'100%',margin:0,padding:0,border:0,height:1,pointerEvents:'none',lineHeight:0,boxShadow:'none'}}/>
                  }
                </div>
                <div className="form-group form_style">
                  <label>Tags</label>
                </div>
                {
                  (!this.props.data.tags || this.props.data.tags.length === 0) &&
                    <p className="text-center">
                      None Selected
                    </p>
                }
                <ul className="list-inline color_tag">
                  {
                    _.map(this.props.data.tags, (id, index) =>
                      <li key={id}>
                        <a href="#t" className="gray_tag" onClick={this.removeTag.bind(null, 'tags', index)}>
                          {id}
                        </a>
                      </li>
                    )
                  }
                </ul>
              </EDFormBox>
          }
          {
            this.props.data.type === 'tags' &&
              <EDFormBox space>
                <div className="edit_txt" style={{fontSize:'12px', position: 'absolute', right: '30px', fontWeight: 600}}>
                  <Select2
                    data={exittagitems}
                    value=""
                    onSelect={this.addTag.bind(null, 'exittags')}
                    onClose={this.onClose.bind(null, 'addexittags')}
                    ref="addexittags"
                    style={{width:'180px'}}
                    options={{
                      placeholder: 'Add Tag',
                      tags: true,
                      createTag: function (params) {
                        const fixed = fixTag(params.term);
                        if (!fixed) {
                          return null;
                        }
                        return {
                          id: fixTag(params.term),
                          text: fixTag(params.term)
                        }
                      }
                    }}
                  />
                </div>
                <div className="form-group form_style">
                  <label>Contact exits funnel if tagged with</label>
                </div>
                {
                  (!this.props.data.exittags || this.props.data.exittags.length === 0) && <p className="text-center">None Selected</p>
                }
                <ul className="list-inline color_tag">
                  {
                    _.map(this.props.data.exittags, (id, index) =>
                      <li key={id}>
                        <a href="#t" className="gray_tag" onClick={this.removeTag.bind(null, 'exittags', index)}>
                          {id}
                        </a>
                      </li>
                    )
                  }
                </ul>
              </EDFormBox>
          }
          <EDFormBox space className="campaign_edit">
            <TemplateHeader user={this.props.user} data={this.props.data} update={this.props.update} noSubject={true} fields={this.props.allfields} />
          </EDFormBox>
          <EDFormBox space>
            <div className="form_style">
            { !this.props.routes
              ?
                null
              :
                <SelectLabel
                  id="route"
                  label="Send via Route:"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  options={this.props.routes}
                  help={routesHelp(this.props.routes)}
                />
            }
            <CheckboxLabel
              id="multiple"
              obj={this.props.data}
              label="Allow contacts to go through funnel multiple times"
              onChange={this.handleChange}
              space={!!this.props.routes}
            />
            </div>
          </EDFormBox>
          { this.props.id === 'new' &&
            <div>
              <NewTemplate setIsSaving={this.setIsSaving} onCancel={this.cancelSubmit}
                           isSaving={this.state.isSaving || this.props.isSaving}
                           user={this.props.user}
                           setSubmitCB={this.setSubmitCB} finishSubmit={this.finishSubmit} />
            </div>
          }
          <div className={(this.props.id === 'new' && this.props.user.hasbeefree)?'split-design-btn':''}>
            <LoaderButton
              isLoading={this.props.isSaving || this.state.isSaving}
              type="submit"
              className="next action-button"
              text="Design Your Funnel"
              loadingText="Saving..."
              disabled={!this.validateForm()}
              onClick={() => { this.setState({legacyEditor: false}, () => this.props.formSubmit(true)) } }
              splitItems={
                (this.props.id === 'new' && this.props.user.hasbeefree) ? [
                { text: 'Design Your Funnel (Legacy Editor)', onClick: () => { this.setState({legacyEditor: true}, () => this.props.formSubmit(true)) } },
              ] : undefined}
            />
          </div>
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  initial: {
    name: '',
    type: '',
    fromname: '',
    returnpath: '',
    fromemail: '',
    replyto: '',
    multiple: false,
    tags: [],
    exittags: [],
    messages: [],
  },
  extend: FunnelSettings,
  get: async ({id}) => (await axios.get('/api/funnels/' + id)).data,
  post: async ({data}) => (await axios.post('/api/funnels/', data)).data,
  patch: ({id, data}) => axios.patch('/api/funnels/' + id, data),
  extra: {
    tags: async() => (await axios.get('/api/recenttags')).data,
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
    allfields: async () => (await axios.get('/api/allfields')).data,
  },
  extramerge: {
    route: 'routes',
  }
});
