import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import TemplateEditor from "../components/TemplateEditor";
import { FormControlLabel, CheckboxLabel, SelectLabel } from "../components/FormControls";
import { DropdownButton, MenuItem, Modal, Button, ControlLabel, FormGroup, Nav, NavItem, ToggleButtonGroup, ToggleButton, HelpBlock } from "react-bootstrap";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox, EDTabs } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";
import getvalue from "../utils/getvalue";
import Beforeunload from "react-beforeunload"
import { Prompt } from "react-router-dom";
import TitlePage from "../components/TitlePage";
import _ from "underscore";
import fixTag from "../utils/fixtag";
import Select2 from "react-select2-wrapper";
import clipboardCopy from "../utils/clipboard";
import { getWebroot } from "../utils/webroot";

import "react-select2-wrapper/css/select2.css";

import "./Form.css";

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

class Form extends Component {
  constructor(props) {
    super(props);

    this.state = {
      changed: false,
      activeKey: '1',
      showModal: false,
      showCopyModal: false,
      designType: 'desktop',
    };
  }

  switchView = v => {
    this.setState({activeKey: v});
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    } else {
      this.setState({changed: false});
    }
  }

  goBack = () => {
    this.setState({changed: false}, () => {
      this.props.history.push('/forms');
    });
  }

  onChange = event => {
    var id = event.target.id;
    var val = getvalue(event);
    this.setState({changed: true});
    this.props.update({[id]: {$set: val}});
  }

  onRadioChange = (prop, val) => {
    this.setState({changed: true});
    if (this.state.designType === 'desktop') {
      this.props.update({[prop]: {$set: val}});
    } else {
      this.props.update({mobile: {[prop]: {$set: val}}});
    }
  }

  onDesignTypeChange = val => {
    this.setState({designType: val});
  }

  validateForm = () => {
    return this.props.data.name;
  }

  navbarButtons = () => {
    return (
      <div>
        <LoaderButton
          id="template-buttons-dropdown2"
          text="Save"
          loadingText="Saving..."
          className="green"
          disabled={this.props.isSaving}
          onClick={() => {
            sendGA4Event('Forms', 'Saved a Form', 'Saved a Form');
            return this.props.formSubmit();
          }}
        />
        <LoaderButton
          id="template-buttons-dropdown"
          text="Save and Close"
          loadingText="Saving..."
          className="green"
          style={{marginLeft: '10px'}}
          disabled={this.props.isSaving}
          onClick={() => {
            sendGA4Event('Forms', 'Saved a Form', 'Saved a Form');
            return this.props.formSubmit(true);
          }}
          splitItems={[
            { text: 'Cancel', onClick: this.goBack }
          ]}
        />
      </div>
    )
  }

  update = (u, cb) => {
    this.setState({changed: true});
    this.props.update(u, cb);
  }

  tagData() {
    if (!this.props.tags)
      return [];
    if (_.isUndefined(this._tags)) {
      this._tags = _.uniq(this.props.tags.concat(this.props.data.tags));
    }
    return this._tags;
  }

  onTagChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}}, () => {
      this.setState({changed: true});
    });
  }

  onEmbed = async () => {
    await this.props.save();

    this.setState({changed: false, showModal: true});
  }

  hostedURL() {
    var url = getWebroot(this.props);
    url += '/api/showform/' + this.props.id;
    return url;
  }

  openHostedURL = () => {
    window.open(this.hostedURL(), '_blank');
  }

  embeddedURL() {
    var url = getWebroot(this.props);
    url += '/api/showform/' + this.props.id + '/embed.js';
    return '<script id="script-' + this.props.id + '" src="' + url + '" async></script>';
  }

  copyEmbeddedURL = () => {
    sendGA4Event('Forms', 'Copied Form Snippet', 'Copied Form Snippet');
    clipboardCopy(this.embeddedURL(), this._modalRef);
  }

  copyText = t => {
    clipboardCopy(t);
  }

  externalURL() {
    var url = getWebroot(this.props);
    url += '/api/postform/' + this.props.id;
    return url;
  }

  trackerURL() {
    var url = getWebroot(this.props);
    url += '/api/trackform/' + this.props.id;
    return url;
  }

  onRefresh = async () => {
    var d = (await axios.get('/api/forms/' + this.props.id)).data;
    this.props.update({
      views: {$set:d.views},
      views_uniq: {$set:d.views_uniq},
      submits: {$set:d.submits},
      submits_uniq: {$set:d.submits_uniq},
    });
  }

  onImport = ok => {
    if (!ok) {
      this.setState({showCopyModal: false});
      return;
    }

    this.setState({changed: true, showCopyModal: false}, () => {
      if (this.state.designType === 'desktop') {
        let d = this.props.data.mobile;
        let bs = clone(d.bodyStyle);
        bs.bodyType = this.props.data.bodyStyle.bodyType;
        bs.bodyWidth = this.props.data.bodyStyle.bodyWidth;
        bs.mobileWidth = this.props.data.bodyStyle.mobileWidth;
        this.props.update({
          parts: {$set:clone(d.parts)},
          bodyStyle: {$set:bs},
          display: {$set:d.display},
          hellolocation: {$set:d.hellolocation},
          slidelocation: {$set:d.slidelocation},
          modaldismiss: {$set:d.modaldismiss},
          inlinedismiss: {$set:d.inlinedismiss},
        });
      } else  {
        let d = this.props.data;
        let bs = clone(d.bodyStyle);
        bs.bodyType = this.props.data.mobile.bodyStyle.bodyType;
        bs.bodyWidth = this.props.data.mobile.bodyStyle.bodyWidth;
        bs.mobileWidth = this.props.data.mobile.bodyStyle.mobileWidth;
        this.props.update({
          mobile: {
            parts: {$set:clone(d.parts)},
            bodyStyle: {$set:bs},
            display: {$set:d.display},
            hellolocation: {$set:d.hellolocation},
            slidelocation: {$set:d.slidelocation},
            modaldismiss: {$set:d.modaldismiss},
            inlinedismiss: {$set:d.inlinedismiss},
          },
        });
      }
    });
  }

  render() {
    var exampleform = `<form method="POST" action="${this.externalURL()}">
  <input type="email" required name="Email" placeholder="Your Email Address" />

  <!-- add more inputs for other desired user properties here -->

  <button type="submit">Submit</button>

  <!-- invisible tracking pixel to enable form statistics -->
  <img src="${this.trackerURL()}" />
</form>
`;

    var ps = this.props.data;
    if (this.state.designType === 'mobile') {
      ps = this.props.data.mobile || {};
    }
    var displayButtons = {
      slide: (<div>
                <span className="name">Slide</span>
                <img src={"/img/forms/slide-" + ps.slidelocation + ".png"} alt="slide" />
              </div>),
      hello: (<div>
                <span className="name">Hello</span>
                <img src={"/img/forms/hello-" + ps.hellolocation + ".png"} alt="hello" />
              </div>),
      modal: (<div>
                <span className="name">Modal</span>
                <img src="/img/forms/modal.png" alt="modal" />
              </div>),
      inline: (<div>
                <span className="name">Inline</span>
                <img src="/img/forms/inline.png" alt="inline" />
              </div>),
    };
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        {
          this.state.changed &&
            <Beforeunload onBeforeunload={() => "Are you sure you want to exit without saving?"} />
        }
        <Prompt when={this.state.changed} message="Are you sure you want to exit without saving?" />
        <SaveNavbar title="Edit Form" user={this.props.user} buttons={this.navbarButtons()}
          isSaving={this.props.isSaving} onBack={this.goBack} id={this.props.id}>
          <TitlePage leftsize={9} rightsize={3} tabs={
            <EDTabs>
              <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Design</NavItem>
                <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Display</NavItem>
                <NavItem eventKey="3" disabled={this.state.activeKey==='3'} onClick={this.switchView.bind(null, '3')}>Contacts</NavItem>
                <NavItem eventKey="4" disabled={this.state.activeKey==='4'} onClick={this.switchView.bind(null, '4')}>Statistics</NavItem>
                <NavItem eventKey="5" disabled={this.state.activeKey==='5'} onClick={this.switchView.bind(null, '5')}>Connect</NavItem>
              </Nav>
            </EDTabs>
          }
          button={
            <LoaderButton
              id="embed-button"
              text={<span><i className="fa fa-code" /> Embed</span>}
              loadingText=""
              disabled={this.props.isSaving}
              onClick={this.onEmbed}
            />
          }
          />
          <Modal show={this.state.showModal}>
            <Modal.Header>
              <Modal.Title>
                How to Access your Form
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div ref={r => this._modalRef = r}>
                <FormControlLabel
                  id="url"
                  label="Hosted Form Page:"
                  obj={{url: this.hostedURL()}}
                  readOnly
                />
                <div className="space10" style={{clear: 'both'}} />
                <Button style={{float: 'right'}} onClick={this.openHostedURL}>Open</Button>
                <div className="space10" style={{clear: 'both'}} />
                <FormControlLabel
                  id="url"
                  label="Embedded Form Script:"
                  obj={{url: this.embeddedURL()}}
                  readOnly
                />
                <HelpBlock>Paste this line in the body of your web page. {
                 this.props.data.display === 'inline' && 'The place on the page where you put this tag will be the location the inline form appears.'
                }</HelpBlock>
                <div className="space10" style={{clear: 'both'}} />
                <Button style={{float: 'right'}} onClick={this.copyEmbeddedURL}>Copy</Button>
                <div className="space10" style={{clear: 'both'}} />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={() => this.setState({showModal: false})} bsStyle="primary">Close</Button>
            </Modal.Footer>
          </Modal>
          <Modal show={this.state.showCopyModal}>
            <Modal.Header>
              <Modal.Title>
                Copy {this.state.designType === 'desktop'?'Mobile':'Desktop'} Design to {this.state.designType === 'desktop'?'Desktop':'Mobile'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Import all design settings from the {this.state.designType === 'desktop'?'mobile':'desktop'} version of this form?
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.onImport.bind(null, true)} bsStyle="primary">Yes</Button>
              <Button onClick={this.onImport.bind(null, false)}>No</Button>
            </Modal.Footer>
          </Modal>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef} nospace>
            <FormGroup style={{display: this.state.activeKey==='1'?'block':'none'}}>
              <div className="space10 text-left">
                <span id="designType">
                  <ToggleButtonGroup type="radio" name="designType" value={this.state.designType} onChange={this.onDesignTypeChange}>
                    <ToggleButton value="desktop">
                      <span>Desktop</span>
                    </ToggleButton>
                    <ToggleButton value="mobile">
                      <span>Mobile</span>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </span>
                <span className="typelabel">Type:</span>
                <DropdownButton
                  title={displayButtons[ps.display] || ''}
                  id="displayButton"
                >
                  {
                  _.map(['slide', 'hello', 'modal', 'inline'], d => (
                    <MenuItem key={d} className={ps.display === d?'active':''} onClick={this.onRadioChange.bind(null, 'display', d)}>
                      {displayButtons[d]}
                    </MenuItem>
                  ))
                  }
                </DropdownButton>
                  {
                    (ps.display === 'hello' || ps.display === 'slide') &&
                    <span className="typelabel">Location:</span>
                  }
                  {
                    ps.display === 'hello' &&
                    <DropdownButton
                      id="helloButton"
                      title={
                        <img src={'/img/forms/hello-' + ps.hellolocation + '.png'} alt={ps.hellolocation} />
                      }
                      className="locationButton"
                    >
                      {
                      _.map(['top', 'bottom'], l => (
                        <MenuItem key={l} className={ps.hellolocation === l?'active':''} onClick={this.onRadioChange.bind(null, 'hellolocation', l)}>
                          <img src={'/img/forms/hello-' + l + '.png'} alt={l} />
                        </MenuItem>
                      ))
                      }
                    </DropdownButton>
                  }
                  {
                   ps.display === 'modal' &&
                    <div style={{display: 'inline'}} className="dismiss-check form-inline">
                      <CheckboxLabel
                        id="modaldismiss"
                        obj={ps}
                        label="Dismiss when background clicked"
                        onChange={this.onChange}
                        inline
                      />
                    </div>
                  }
                  {
                   ps.display === 'inline' &&
                    <div style={{display: 'inline'}} className="dismiss-check form-inline">
                      <CheckboxLabel
                        id="inlinedismiss"
                        obj={ps}
                        label="Remove after submit"
                        onChange={this.onChange}
                        inline
                      />
                    </div>
                  }
                  {
                    ps.display === 'slide' &&
                    <DropdownButton
                      id="slideButton"
                      title={<img src={'/img/forms/slide-' + ps.slidelocation + '.png'} alt={ps.slidelocation} />}
                      className="locationButton"
                    >
                      {
                      _.map(['bottom-right', 'bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right'], l => (
                        <MenuItem key={l} className={ps.slidelocation === l?'active':''} onClick={this.onRadioChange.bind(null, 'slidelocation', l)}>
                          <img src={'/img/forms/slide-' + l + '.png'} alt={l} />
                        </MenuItem>
                      ))
                      }
                    </DropdownButton>
                  }
                <div className="exchange-button">
                  <DropdownButton id="exchange" title={<i className="fa fa-exchange" />}>
                    <MenuItem onClick={() => this.setState({showCopyModal: true})}>Copy {this.state.designType==='desktop'?'Mobile':'Desktop'} Design</MenuItem>
                  </DropdownButton>
                </div>
              </div>
              <div className="space10">
                <TemplateEditor user={this.props.user} data={this.props.data} update={this.update} form={true} sideWidth={3} fields={this.props.allfields} designType={this.state.designType} />
              </div>
            </FormGroup>
            <div style={{display: this.state.activeKey==='2'?'block':'none'}}>
              <div id="displaybox" className="space30" style={{marginLeft: '15px', marginRight: '15px'}}>
                <EDFormBox>
                  <div className="form-inline">
                    <FormControlLabel
                      id="showdelaysecs"
                      obj={this.props.data}
                      label="On page load, wait"
                      suffix="seconds, then:"
                      type="number"
                      min="0"
                      style={{width: '75px', textAlign: 'right'}}
                      onChange={this.onChange}
                      required={true}
                      inline
                    />
                    {' '}
                    <SelectLabel
                      id="showwhen"
                      obj={this.props.data}
                      inline
                      onChange={this.onChange}
                    >
                      <option value="">show form immediately</option>
                      <option value="exitintent">show form before user leaves (detect exit intent)</option>
                    </SelectLabel>
                  </div>
                  <div className="space10" />
                  <div className="form-inline">
                    <SelectLabel
                      id="submitaction"
                      obj={this.props.data}
                      label="After submission:"
                      onChange={this.onChange}
                      style={{width: 'auto'}}
                      inline
                    >
                      <option value="msg">show notification message:</option>
                      <option value="url">direct to URL:</option>
                    </SelectLabel>{' '}
                    {
                      this.props.data.submitaction === 'msg' &&
                      <FormControlLabel
                        id="submitmsg"
                        obj={this.props.data}
                        onChange={this.onChange}
                        style={{width: '300px'}}
                        inline
                      />
                    }
                    {
                      this.props.data.submitaction === 'url' &&
                      <FormControlLabel
                        id="submiturl"
                        type="url"
                        obj={this.props.data}
                        onChange={this.onChange}
                        style={{width: '300px'}}
                        inline
                        required={this.props.data.submitaction === 'url'}
                      />
                    }
                  </div>
                  <CheckboxLabel
                    id="hideaftersubmit"
                    obj={this.props.data}
                    label="Don't show again to users who submit the form"
                    onChange={this.onChange}
                  />
                  <div className="form-inline indent">
                    <CheckboxLabel
                      id="returnaftersubmit"
                      obj={this.props.data}
                      label="Bring back after:"
                      disabled={!this.props.data.hideaftersubmit}
                      inline
                      onChange={this.onChange}
                    />
                    {' '}
                    <FormControlLabel
                      id="returnaftersubmitdays"
                      obj={this.props.data}
                      label=""
                      suffix="days"
                      type="number"
                      min="1"
                      style={{width: '75px'}}
                      disabled={!this.props.data.hideaftersubmit || !this.props.data.returnaftersubmit}
                      inline
                      onChange={this.onChange}
                      required={true}
                    />
                  </div>
                  <div className="space10" />
                  <CheckboxLabel
                    id="hideaftershow"
                    obj={this.props.data}
                    label="Don't show again to users who see the form but don't submit"
                    onChange={this.onChange}
                  />
                  <div className="form-inline indent">
                    <CheckboxLabel
                      id="returnaftershow"
                      obj={this.props.data}
                      label="Bring back after:"
                      disabled={!this.props.data.hideaftershow}
                      inline
                      onChange={this.onChange}
                    />
                    {' '}
                    <FormControlLabel
                      id="returnaftershowdays"
                      obj={this.props.data}
                      label=""
                      suffix="days"
                      type="number"
                      min="1"
                      style={{width: '75px'}}
                      disabled={!this.props.data.hideaftershow || !this.props.data.returnaftershow}
                      inline
                      onChange={this.onChange}
                      required={true}
                    />
                  </div>
                  <div className="space10" />
                  <CheckboxLabel
                    id="disabled"
                    obj={this.props.data}
                    label="Disable form (don't show to anyone)"
                    onChange={this.onChange}
                  />
                </EDFormBox>
              </div>
            </div>
            <div style={{display: this.state.activeKey==='3'?'block':'none'}}>
              <div className="space30" style={{marginLeft: '15px', marginRight: '15px'}}>
                <EDFormBox>
                  <SelectLabel
                    id="list"
                    label="Where do you want to save contacts who submit this form?"
                    obj={this.props.data}
                    onChange={this.onChange}
                    options={this.props.lists || []}
                  />
                  <SelectLabel
                    id="funnel"
                    label="Send contacts into this funnel:"
                    obj={this.props.data}
                    onChange={this.onChange}
                    options={this.props.funnels || []}
                    emptyVal="None"
                    space
                  />
                  <div className="space20" />
                  <ControlLabel>Tags to add to contacts:</ControlLabel>
                  <Select2
                    id="tags"
                    multiple
                    value={this.props.data.tags}
                    data={this.tagData()}
                    onChange={this.onTagChange}
                    style={{width:'100%'}}
                    options={{
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
                  <HelpBlock>Type a tag name and press enter to add it</HelpBlock>
                </EDFormBox>
              </div>
            </div>
            <div style={{display: this.state.activeKey==='4'?'block':'none'}}>
              <div className="space30" style={{marginLeft: '15px', marginRight: '15px'}}>
                <EDFormBox>
                  <table className="form-stats">
                    <tbody>
                      <tr>
                        <td>Unique Views:</td>
                        <td>{(this.props.data.views_uniq || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Duplicate Views:</td>
                        <td>{((this.props.data.views || 0) - (this.props.data.views_uniq || 0)).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Unique Conversions:</td>
                        <td>{(this.props.data.submits_uniq || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Duplicate Conversions:</td>
                        <td>{((this.props.data.submits || 0) - (this.props.data.submits_uniq || 0)).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Conversion Rate:</td>
                        <td>{!this.props.data.views_uniq ? '0.00%' : ((((this.props.data.submits_uniq || 0) / (this.props.data.views_uniq || 0)) * 100).toFixed(2) + '%')}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="form-refresh">
                    <LoaderButton
                      id="refresh"
                      text="Refresh"
                      loadingText=""
                      onClick={this.onRefresh}
                    />
                  </div>
                </EDFormBox>
              </div>
            </div>
            <div style={{display: this.state.activeKey==='5'?'block':'none'}}>
              <div className="space30" style={{marginLeft: '15px', marginRight: '15px'}}>
                <EDFormBox>
                  <h5>You can connect this form to an existing or custom HTML form. Copy and customize the following example:</h5>
                  <textarea rows="11" readOnly defaultValue={exampleform}>
                  </textarea>
                  <div style={{clear: 'both'}} />
                  <Button style={{float: 'right'}} onClick={this.copyText.bind(null, exampleform)}>Copy</Button>
                  <div style={{clear: 'both'}} />
                  <p className="space10">When submitted, the above form will redirect to the URL or the message you specify in the <a onClick={e => {e.preventDefault(); this.switchView('2')}} href="#d" style={{fontSize: '14px'}}>Display</a> tab. Settings in the <a style={{fontSize: '14px'}} onClick={e => {e.preventDefault(); this.switchView('3')}} href="#c">Contacts</a> tab will work as usual. All other design/display settings will be ignored.</p>
                </EDFormBox>
              </div>
            </div>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: Form,
  initial: [],
  get: async ({id}) => (await axios.get('/api/forms/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/forms/' + id, data),
  extra: {
    lists: async () => _.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()),
    funnels: async() => _.sortBy(_.filter((await axios.get('/api/funnels')).data, f => f.active && f.type === 'responders'), l => l.name.toLowerCase()),
    allfields: async () => (await axios.get('/api/allfields')).data,
    tags: async() => (await axios.get('/api/recenttags')).data,
  }
});
