import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import { Row, Col, Nav, NavItem, FormGroup, Checkbox, ControlLabel, FormControl, HelpBlock } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import axios from "axios";
import _ from "underscore";
import TemplateEditor from "../components/TemplateEditor";
import TemplateRawEditor from "../components/TemplateRawEditor";
import TemplateWYSIWYGEditor from "../components/TemplateWYSIWYGEditor";
import TemplateBeefreeEditor from "../components/TemplateBeefreeEditor";
import { EDTabs, EDTableSection, EDFormBox } from "../components/EDDOM";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import { FormControlLabel } from "../components/FormControls";
import TestButton from "../components/TestButton";
import getvalue from "../utils/getvalue";
import fixTag from "../utils/fixtag";
import Select2 from "react-select2-wrapper";
import parse from "../utils/parse";
import notify from "../utils/notify";
import TestLog from "../components/TestLog";
import Beforeunload from "react-beforeunload"
import { Prompt } from "react-router-dom";
import classNames from "classnames";

import "react-select2-wrapper/css/select2.css";

class FunnelMessageEdit extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeKey: '1',
      showTestEmailModal: false,
      msgname: '',
      changed: false,
    };

    var p = parse(this);

    this._addSupp = null;
    if (p.suppid) {
      this._addSupp = p.suppid;
    }

    props.setLoadedCB(this.loadedCB);

    this._formRef = null;
    this._saveCB = null;
  }

  save = async () => {
    if (this._saveCB) {
      await this._saveCB();
    }

    return this.props.save();
  }

  loadedCB = () => {
    this.setState({msgname: this.props.data.subject});
  }

  testLog = () => {
    this.setState({showTestLog: true});
  }

  testLogClosed = () => {
    this.setState({showTestLog: false});
  }

  toggleTestEmailModal = (show) => {
    var msg = this.validateForm();
    if (msg) {
      notify.show(msg, "error");
      this.setState({activeKey: '1'});
      return;
    }
    this.setState({showTestEmailModal: typeof show === 'boolean' ? show : !this.state.showTestEmailModal})
  }

  tagData() {
    if (!this.props.tags)
      return [];
    if (_.isUndefined(this._tags)) {
      this._tags = _.uniq(this.props.tags.concat(this.props.data.openaddtags).concat(this.props.data.openremtags)
        .concat(this.props.data.clickaddtags).concat(this.props.data.clickremtags)
        .concat(this.props.data.sendaddtags).concat(this.props.data.sendremtags));
    }
    return this._tags;
  }

  componentDidUpdate() {
    if (this.props.data.supplists && this._addSupp) {
      this.props.update({supplists: {$push: [this._addSupp]}});
      this.setState({activeKey: '3'});     
      this._addSupp = null;
    }
  }

  update = (u, cb) => {
    this.setState({changed: true});
    this.props.update(u, cb);
  }

  uploadClicked = async event => {
    event.preventDefault();

    if (this.props.isSaving)
      return;

    await this.save();

    await this.props.reloadUser();

    this.setState({changed: false}, () => {
      this.props.history.push('/suppression/new?msgid=' + this.props.id + '&funnelid=' + this.props.funnel.id);
    });
  }

  onTagChange = event => {
    var id = event.target.id;
    var val = getvalue(event);
    this.setState({changed: true});
    this.props.update({[id]: {$set: val}});
  }

  addSelectItem = (prop, event) => {
    var id = event.params.data.id;
    if (!_.find(this.props.data[prop], t => t === id)) {
      this.setState({changed: true});
      this.props.update({[prop]: {$push: [id]}});
    }
  }

  removeItem = (prop, index, e) => {
    e.preventDefault();

    this.setState({changed: true});
    this.props.update({[prop]: {$splice: [[index, 1]]}});
  }

  onSave = async event => {
    if (event) {
      event.preventDefault();
    }

    await this.save();

    return new Promise(resolve => {
      this.setState({changd: false}, async () => {
        await this.props.reloadUser(); // for footer
        resolve();
      });
    });
  }

  onCancel = () => {
    var p = parse(this);
    this.setState({changed: false}, () => {
      this.props.history.push('/funnels/message?id=' + p.funnelid);
    });
  }

  onSaveExit = async event => {
    var msg = this.validateForm();
    if (msg) {
      notify.show(msg, "error");
      this.setState({activeKey: '1'});
      return;
    }

    await this.onSave(event);

    this.onCancel();
  }

  switchView = v => {
    this.setState({activeKey: v});
  }

  handleChange = event => {
    var id = event.target.id;
    var val = getvalue(event);
    this.setState({changed: true});
    this.props.update({[id]: {$set: val}});
  }

  updateEmails = emails => {
    axios.patch('/api/testemails', emails);
  }

  sendTest = async to => {
    await this.save();

    await axios.post('/api/messages/' + this.props.id + '/test', {
      to: to,
    });

    await this.props.reloadUser();

    this.props.reloadExtra();

    notify.show('Test email submitted', "success", 5000);
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="funnel-message-edit-buttons-dropdown"
        text="Send Test Email"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving || this.props.isLoading}
        onClick={() => {
          sendGA4Event('Funnels', 'Sent Test Funnel Email', 'Send Test Funnel Email');
          return this.toggleTestEmailModal();
        }}
        splitItems={[
          { text: 'Test Log', onClick: this.testLog },
          {
            text: 'Save and Exit',
            onClick: () => {
              sendGA4Event('Funnels', 'Saved Funnel Message', 'Created Funnel Message');
              return this.onSaveExit();
            }
          },
          { text: 'Cancel', onClick: this.onCancel }
        ]}
      />
    )
  }

  days(i) {
    if (!this.props.data.days) {
      return true;
    }
    return this.props.data.days[i];
  }

  dayChange = (i, event) => {
    if (!this.props.data.days) {
      var days = [
        true, true, true, true, true, true, true
      ];
      days[i] = getvalue(event);

      this.setState({changed: true});
      this.props.update({days: {$set: days}, dayoffset: {$set: -(new Date()).getTimezoneOffset()}});
    } else {
      var val = getvalue(event);
      this.setState({changed: true});
      this.props.update({days: {[i]: {$set: val}}, dayoffset: {$set: -(new Date()).getTimezoneOffset()}});
    }
  }

  validateForm = () => {
    // XXX
    if (!this.props.data.subject) {
      return "Please enter a message subject";
    }
    return null;
  }

  render() {
    var ph = this.props.data.type !== 'raw';
    var title = 'Edit Message';
    if (this.state.msgname) {
      title += ` "${this.state.msgname}"`;
    }

    var supplistitems = _.map(_.filter(this.props.supplists, l => !_.find(this.props.data.supplists, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var suppsegitems = _.map(_.filter(this.props.segments, l => !_.find(this.props.data.suppsegs, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var supptagitems = _.map(_.filter(this.props.tags, l => !_.find(this.props.data.supptags, id => id === l)), t => ({id: t, text: t}));

    var isfirst = this.props.funnel && _.findIndex(this.props.funnel.messages, m => m.id === this.props.id) === 0;

    return (
      <div>
        {
          this.state.changed &&
            <Beforeunload onBeforeunload={() => "Are you sure you want to exit without saving?"} />
        }
        <Prompt when={this.state.changed} message="Are you sure you want to exit without saving?" />
        <LoaderPanel isLoading={this.props.isLoading}>
          <SaveNavbar title={title} onBack={this.onSaveExit} buttons={this.navbarButtons()} id={this.props.id} user={this.props.user}>
            <TestLog show={this.state.showTestLog} onClose={this.testLogClosed} />
            <span style={{display: 'none'}}>
              <TestButton
                preCheck={this.validateForm}
                emails={this.props.testemails}
                onConfirm={this.sendTest}
                disabled={this.props.isSaving}
                onUpdate={this.updateEmails}
                toggleModal={this.toggleTestEmailModal}
                showModal={this.state.showTestEmailModal}
                lasttest={this.props.lasttest}
              />
            </span>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                  <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Message</NavItem>
                  <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Settings</NavItem>
                  <NavItem eventKey="3" disabled={this.state.activeKey==='3'} onClick={this.switchView.bind(null, '3')}>Tagging</NavItem>
                  <NavItem eventKey="4" disabled={this.state.activeKey==='4'} onClick={this.switchView.bind(null, '4')}>Suppression</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='1'?'block':'none'}}>
              <Col xs={12}>
                <Row>
                  <Col sm={ph?6:12}>
                    <FormControlLabel
                      id="subject"
                      label="Subject"
                      obj={this.props.data}
                      onChange={this.handleChange}
                    />
                  </Col>
                  { ph &&
                    <Col sm={6}>
                      <FormControlLabel
                        id="preheader"
                        label="Preview text pre-header (optional)"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                    </Col>
                  }
                </Row>
                <FormGroup className={classNames("space20", {nobottomspace: this.props.data.type === 'beefree'})}>
                  {
                    !this.props.data.type?
                      <TemplateEditor user={this.props.user} data={this.props.data} update={this.update} fields={this.props.allfields} />
                    :
                    this.props.data.type === 'beefree' ?
                      <TemplateBeefreeEditor data={this.props.data} update={this.update}
                        onChange={() => this.setState({changed: true})}
                        setSaveCB={cb => this._saveCB = cb}
                        fields={this.props.allfields} loggedInImpersonate={this.props.loggedInImpersonate}
                        user={this.props.user} />
                      :
                      this.props.data.type === 'raw' ?
                        <TemplateRawEditor data={this.props.data} update={this.update} fields={this.props.allfields} />
                      :
                        <TemplateWYSIWYGEditor data={this.props.data} update={this.update} fields={this.props.allfields}
                          loggedInUID={this.props.loggedInUID} loggedInCookie={this.props.loggedInCookie}
                          loggedInImpersonate={this.props.loggedInImpersonate} />
                  }
                </FormGroup>
              </Col>
            </Row>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='2'?'block':'none'}}>
              <Col xs={12}>
                <EDFormBox className="campaign_box">
                  <FormGroup className="space20 form-inline">
                    <ControlLabel>Days to send this message:</ControlLabel>
                    <div className="space10">
                      <Checkbox inline style={{width:'auto'}} checked={this.days(0)} onChange={this.dayChange.bind(null, 0)}>Monday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(1)} onChange={this.dayChange.bind(null, 1)}>Tuesday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(2)} onChange={this.dayChange.bind(null, 2)}>Wednesday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(3)} onChange={this.dayChange.bind(null, 3)}>Thursday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(4)} onChange={this.dayChange.bind(null, 4)}>Friday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(5)} onChange={this.dayChange.bind(null, 5)}>Saturday</Checkbox>
                      <Checkbox inline style={{width:'auto'}} checked={this.days(6)} onChange={this.dayChange.bind(null, 6)}>Sunday</Checkbox>
                    </div>
                  </FormGroup>
                  <FormGroup className="space20">
                    <ControlLabel>Send this message to:</ControlLabel>
                    {
                      isfirst ?
                        <FormControl bsClass="form-control" componentClass="select" id="who" value={'all'} disabled style={{width: 'auto'}}>
                          <option value="all">Everyone</option>
                        </FormControl>
                      :
                        <FormControl bsClass="form-control" componentClass="select" id="who" value={this.props.data.who} onChange={this.handleChange} style={{width: 'auto'}}>
                          <option value="all">Everyone</option>
                          <option value="openany">Openers or Clickers of Any Message</option>
                          <option value="openlast">Openers or Clickers of Last Message</option>
                          <option value="clickany">Clickers of Any Message</option>
                          <option value="clicklast">Clickers of Last Message</option>
                        </FormControl>
                    }
                  </FormGroup>
                  <div className="space20">
                    {
                      !isfirst && (this.props.data.who === 'openlast' || this.props.data.who === 'clicklast') &&
                        <HelpBlock>
                          Note: the wait time before sending will only begin once the user has {this.props.data.who === 'clicklast' ? 'clicked' : 'opened or clicked'} the message.
                        </HelpBlock>
                    }
                    {
                      !isfirst && (this.props.data.who === 'openany' || this.props.data.who === 'openlast') &&
                        <HelpBlock>
                          In some cases, open tracking only occurs if the reader clicks "show images" at the top of their reader, so pure text messages may not capture all openers.
                        </HelpBlock>
                    }
                  </div>
                </EDFormBox>
              </Col>
            </Row>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='3'?'block':'none'}}>
              <Col md={10} mdOffset={1}>
                <EDFormBox className="campaign_box">
                  <Row>
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/add-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Add tags when a contact <b>opens</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="openaddtags"
                        multiple
                        value={this.props.data.openaddtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <Row className="space10">
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/remove-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Remove tags when a contact <b>opens</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="openremtags"
                        multiple
                        value={this.props.data.openremtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <Row className="space10">
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/add-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Add tags when a contact <b>clicks</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="clickaddtags"
                        multiple
                        value={this.props.data.clickaddtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <Row className="space10">
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/remove-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Remove tags when a contact <b>clicks</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="clickremtags"
                        multiple
                        value={this.props.data.clickremtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <Row className="space10">
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/add-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Add tags when a contact is <b>sent</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="sendaddtags"
                        multiple
                        value={this.props.data.sendaddtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <Row className="space10">
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/remove-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Remove tags when a contact is <b>sent</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        id="sendremtags"
                        multiple
                        value={this.props.data.sendremtags}
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
                    </Col>
                  </Row>
                </EDFormBox>
              </Col>
            </Row>
            <Row className="space50 text-left" style={{display:this.state.activeKey==='4'?'block':'none'}}>
              <div className="suppression" style={{paddingTop: 0}}>
                <h2>Suppression and Exclusion</h2>
              </div>
              <div className="img_camp">
                <span>
                  <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img2.jpg" />
                </span>
                <div className="campaign_box">
                  <div className="edit_txt">
                    <Select2
                      disabled={!supplistitems.length}
                      data={supplistitems}
                      value=""
                      onSelect={this.addSelectItem.bind(null, 'supplists')}
                      style={{width:'180px'}}
                      options={{
                        placeholder: 'Add Suppression'
                      }}
                    />
                  </div>
                  <div className="form-group form_style">
                    <label>Suppression Lists</label>
                  </div>
                  {
                    this.props.data.supplists && this.props.data.supplists.length === 0 && <p className="text-center">None Selected</p>
                  }
                  <ul className="list-inline color_tag">
                    {
                      _.map(this.props.data.supplists, (id, index) => {
                        var l = _.find(this.props.supplists, l => l.id === id);
                        return (
                          <li key={id}>
                            <a href="#t" className="orange1_tag" onClick={this.removeItem.bind(null, 'supplists', index)}>
                              {l?l.name:'Unknown'}
                            </a>
                          </li>
                        );
                      })
                    }
                  </ul>
                </div>
              </div>
              <div className="space20"></div>
              <div className="img_camp">
                <span>
                  <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img2.jpg" />
                </span>
                <div className="campaign_box">
                  <div className="edit_txt">
                    <Select2
                      disabled={!suppsegitems.length}
                      data={suppsegitems}
                      value=""
                      onSelect={this.addSelectItem.bind(null, 'suppsegs')}
                      style={{width:'180px'}}
                      options={{
                        placeholder: 'Add Segment'
                      }}
                    />
                  </div>
                  <div className="form-group form_style">
                    <label>Exclude Segments</label>
                  </div>
                  {
                    this.props.data.suppsegs && this.props.data.suppsegs.length === 0 && <p className="text-center">None Selected</p>
                  }
                  <ul className="list-inline color_tag">
                    {
                      _.map(this.props.data.suppsegs, (id, index) => {
                        var l = _.find(this.props.segments, l => l.id === id);
                        return (
                          <li key={id}>
                            <a href="#t" className="orange_tag" onClick={this.removeItem.bind(null, 'suppsegs', index)}>
                              {l?l.name:'Unknown'}
                            </a>
                          </li>
                        );
                      })
                    }
                  </ul>
                </div>
              </div>
              <div className="space20"></div>
              <div className="img_camp">
                <span>
                  <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img2.jpg" />
                </span>
                <div className="campaign_box">
                  <div className="edit_txt">
                    <Select2
                      disabled={!supptagitems.length}
                      data={supptagitems}
                      value=""
                      onSelect={this.addSelectItem.bind(null, 'supptags')}
                      style={{width:'180px'}}
                      options={{
                        placeholder: 'Add Tag'
                      }}
                    />
                  </div>
                  <div className="form-group form_style">
                    <label>Exclude Tags</label>
                  </div>
                  {
                    (!this.props.data.supptags || this.props.data.supptags.length === 0) && <p className="text-center">None Selected</p>
                  }
                  <ul className="list-inline color_tag">
                    {
                      _.map(this.props.data.supptags, (id, index) =>
                        <li key={id}>
                          <a href="#t" className="gray_tag" onClick={this.removeItem.bind(null, 'supptags', index)}>
                            {id}
                          </a>
                        </li>
                      )
                    }
                  </ul>
                </div>
              </div>
            </Row>
            </EDTableSection>
          </SaveNavbar>
        </LoaderPanel>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: FunnelMessageEdit,
  get: async ({id}) => (await axios.get('/api/messages/' + id)).data,
  patch: async ({id, data}) => (await axios.patch('/api/messages/' + id, data)).data,
  extra: {
    funnel: async ({funnelid}) => (await axios.get('/api/funnels/' + funnelid)).data,
    supplists: async () => _.sortBy((await axios.get('/api/supplists')).data, l => l.name.toLowerCase()),
    segments: async () => _.sortBy((await axios.get('/api/segments')).data, l => l.name.toLowerCase()),
    tags: async() => (await axios.get('/api/recenttags')).data,
    testemails: async () => (await axios.get('/api/testemails')).data,
    lasttest: async () => (await axios.get('/api/lasttest')).data,
    allfields: async () => (await axios.get('/api/allfields')).data,
  },
});
