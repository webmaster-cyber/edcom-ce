import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import { FormGroup, Panel, Radio, Modal, Button, Row, Col } from "react-bootstrap";
import { FormControlLabel, CheckboxLabel, SelectLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import getvalue from "../utils/getvalue";
import axios from "axios";
import MenuNavbar from "../components/MenuNavbar";
import _ from "underscore";
import TemplateHeader from "../components/TemplateHeader";
import { ReadOnlyTemplateEditor } from "../components/TemplateEditor";
import TemplateRawEditor from "../components/TemplateRawEditor";
import TemplateWYSIWYGEditor from "../components/TemplateWYSIWYGEditor";
import TemplateBeefreeEditor from "../components/TemplateBeefreeEditor";
import Datetime from "react-datetime";
import moment from "moment";
import { EDTableSection, EDFormBox } from "../components/EDDOM";
import ScrollToTop from "../components/ScrollToTop";
import fixTag from "../utils/fixtag";
import Select2 from "react-select2-wrapper";
import InfoBox from "../components/InfoBox";
import notify from "../utils/notify";
import { routesHelp } from "../utils/template-utils";

import "react-select2-wrapper/css/select2.css";

import "../../node_modules/react-datetime/css/react-datetime.css";

import "./BroadcastReview.css";

class BroadcastReview extends Component {
  constructor(props) {
    super(props);

    this.state = {
      confirmMsg: '',
      showConfirm: false,
      defaultSchedule: moment().add(1, 'day').hours(9).minutes(0).seconds(0),
      nameEditing: false,
      headerEditing: false,
    };
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

  onTagChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  validateForm() {
    var d = this.props.data;

    if (!(d.name && d.subject && d.fromname && d.returnpath && (
      d.lists.length || d.segments.length || d.tags.length
    ))) {
      notify.show("This broadcast is missing one or more required parameters", "error");
      return false;
    }

    return true;
  }

  handleChange = async event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  handleDateChange = v => {
    if (!v || !v.isBefore) {
      return;
    }
    this.props.update({scheduled_for: {$set: moment(v).utc().format()}});
  }

  isDateValid = v => {
    return v.isSameOrAfter(moment().subtract(1, 'day'));
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    var p = {};

    if (this.props.data.when === 'now') {
      this.setState({showConfirm: true, confirmMsg: 'Are you sure you want to send this broadcast now?'});
      return;
    } else if (this.props.data.when === 'schedule') {
      var dt = this.props.data.scheduled_for;
      if (!dt) {
        dt = moment(this.state.defaultSchedule).utc().format();
      }

      var msg = 'Are you sure you want to schedule this broadcast for ' + moment(dt).format('lll')  + '?';
      if (moment(dt).isBefore(moment())) {
        msg += ' This date is in the past, so your broadcast will start immediately.';
      }

      this.setState({showConfirm: true,
                     confirmMsg: msg});
      return;
    } else {
      p.scheduled_for = null;
    }

    await this.props.save(p);

    this.props.history.push('/broadcasts');
  }

  confirmClicked = async yes => {
    this.setState({showConfirm: false});

    if (!yes) {
      return;
    }

    var p = {};
    if (this.props.data.when === 'schedule' && !this.props.data.scheduled_for) {
      p.scheduled_for = moment(this.state.defaultSchedule).utc().format();
    }

    sendGA4Event('Broadcast', 'Sent Broadcast', 'User sent or scheduled a broadcast');
    await this.props.save(p);

    if (this.props.data.when === 'now') {
      await axios.post('/api/broadcasts/' + this.props.id + '/start');
    }

    this.props.history.push('/broadcasts');
  }

  goBack = async event => {
    event.preventDefault();

    await this.props.save({when: 'draft'});

    this.props.history.push('/broadcasts/rcpt?id=' + this.props.id);
  }

  goBackTemplate = async event => {
    event.preventDefault();

    await this.props.save({when: 'draft'});

    this.props.history.push('/broadcasts/template?id=' + this.props.id);
  }

  switchView = url => {
    this.props.history.push(url);
  }

  onExit = () => {
    this.props.history.push('/broadcasts');
  }

  toggle = (prop, event) => {
    event.preventDefault();

    if (this.state[prop]) {
      this.props.save();
    }

    this.setState({[prop]: !this.state[prop]});
  }

  ignore = event => {
    event.preventDefault();
  }

  render() {
    var dt = this.props.data.scheduled_for;

    const ro = !!this.props.data.sent_at;

    return (
      <div className="review">
        <ScrollToTop />
        <MenuNavbar {...this.props}>
          <LoaderPanel isLoading={this.props.isLoading}>
            { !ro &&
            <section id="broadcast">
              <div className="container-fluid">
                <div className="row flex-items">
                  <div className="col-md-6 col-sm-6">
                    <a href="#b" onClick={this.goBack}>
                      <i className="fa fa-angle-left" />
                      Back to broadcast wizard
                    </a>
                  </div>
                  <div className="col-md-6 col-sm-6">
                    <ul className="list-inline text-right">
                      <li>
                        <Button bsStyle="primary" onClick={this.handleSubmit} disabled={this.props.isSaving}>
                          {
                            this.props.data.when === 'draft' ?
                              'Save Broadcast'
                            : (
                              this.props.data.when === 'schedule' ?
                                'Schedule Broadcast'
                                :
                                'Send Broadcast'
                            )
                          }
                        </Button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
            }
            <EDTableSection>
              <section className="campaign">
                { !ro &&
                <div>
                <EDFormBox className="campaign_box">
                  <label>When do you want to send your broadcast?</label>
                  <FormGroup controlId="when" className="form-inline form_style">
                    <ul className="list-inline ul_list">
                      <li>
                        <Radio inline name="whenGroup" id="when" value="now" checked={this.props.data.when==='now'} onChange={this.handleChange}>Send Now</Radio>
                      </li>
                      <li>
                        <Radio inline name="whenGroup" id="when" value="schedule" checked={this.props.data.when==='schedule'} onChange={this.handleChange}>Schedule For:</Radio>{' '}
                      </li>
                      <li>
                        <Datetime value={dt?moment(dt):this.state.defaultSchedule} onChange={this.handleDateChange} isValidDate={this.isDateValid} inputProps={{disabled: this.props.data.when!=='schedule'}}/>
                      </li>
                      <li>
                        <Radio inline name="whenGroup" id="when" value="draft" checked={this.props.data.when==='draft'} onChange={this.handleChange}>Save in Drafts</Radio>{' '}
                      </li>
                    </ul>
                  </FormGroup>
                  { !this.props.routes
                  ?
                    null
                  :
                  <div className="form_style">
                    <SelectLabel
                      id="route"
                      label="Send via route:"
                      obj={this.props.data}
                      onChange={this.handleChange}
                      options={this.props.routes}
                      help={routesHelp(this.props.routes)}
                    />
                  </div>
                  }
                  <div className="form_style" style={{display: this.props.data.is_resend?'none':'block'}}>
                    <b>
                      <CheckboxLabel
                        id="resend"
                        disabled={ro}
                        label="Resend this broadcast to non-openers"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                    </b>
                    <div style={{display: (this.props.data.resend && !this.props.data.is_resend)?'block':'none'}} className="resend-box">
                      <div className="form-inline">
                        <FormControlLabel
                          inline
                          id="resendwhennum"
                          disabled={ro}
                          obj={this.props.data}
                          onChange={this.handleChange}
                          type="number"
                          min="1"
                          style={{width: '80px'}}
                        />
                        <SelectLabel
                          inline
                          id="resendwhentype"
                          disabled={ro}
                          obj={this.props.data}
                          onChange={this.handleChange}
                          options={[
                          {id: 'days', name: 'Days'}, {id: 'hours', name: 'Hours'}
                          ]}
                        />
                        <label>after delivery finishes</label>
                      </div>
                      <Row>
                        <Col md={6}>
                          <FormControlLabel
                            id="resendsubject"
                            placeholder={this.props.data.subject}
                            disabled={ro}
                            label="New Subject"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                        </Col>
                        <Col md={6}>
                          <FormControlLabel
                            id="resendpreheader"
                            placeholder={this.props.data.preheader}
                            disabled={ro}
                            label="New Preheader"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                        </Col>
                      </Row>
                    </div>
                  </div>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <label>Tagging</label>
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
                        disabled={ro}
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
                        disabled={ro}
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
                        disabled={ro}
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
                        disabled={ro}
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
                        disabled={ro}
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
                        disabled={ro}
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
                <Modal show={this.state.showConfirm}>
                  <Modal.Header>
                    <Modal.Title>Send Confirmation</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <p>{this.state.confirmMsg}</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
                    <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
                  </Modal.Footer>
                </Modal>
                </div>
                }
                <EDFormBox space className="campaign_box">
                  <SelectLabel
                    id="funnel"
                    disabled={ro}
                    label="Add openers/clickers to funnel:"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    options={this.props.funnels}
                    emptyVal="None"
                  />
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <div className="form_style">
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#edit" onClick={this.toggle.bind(null, 'nameEditing')}>
                        <img alt="pen" src="/img/pen.jpg" />
                        { this.state.nameEditing ?
                          'Save'
                          :
                          'Edit'
                        }
                      </a>
                    </h4>
                    }
                    <FormControlLabel
                      id="name"
                      roph={!this.state.nameEditing}
                      label="Broadcast Name"
                      obj={this.props.data}
                      onChange={this.handleChange}
                    />
                  </div>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <div className="form_style header_box">
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#edit" onClick={this.toggle.bind(null, 'headerEditing')}>
                        <img alt="pen" src="/img/pen.jpg" />
                        { this.state.headerEditing ?
                          'Save'
                          :
                          'Edit'
                        }
                      </a>
                    </h4>
                    }
                    <TemplateHeader readOnly={!this.state.headerEditing} user={this.props.user} data={this.props.data} update={this.props.update} />
                  </div>
                </EDFormBox>
                <div className="space20"></div>
                <div className="img_camp">
                  <span>
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img1.jpg" />
                  </span>
                  <div className="campaign_box">
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
                    <div className="form-group form_style">
                      <label>Contact Lists</label>
                    </div>
                    {
                      this.props.data.lists && this.props.data.lists.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.lists, (id, index) => {
                          var l = _.find(this.props.lists, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className="green_tag disabled" onClick={this.ignore}>
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
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img1.jpg" />
                  </span>
                  <div className="campaign_box">
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
                    <div className="form-group form_style">
                      <label>Segments</label>
                    </div>
                    {
                      this.props.data.segments && this.props.data.segments.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.segments, (id, index) => {
                          var l = _.find(this.props.segments, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className="orange_tag disabled" onClick={this.ignore}>
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
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img1.jpg" />
                  </span>
                  <div className="campaign_box">
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
                    <div className="form-group form_style">
                      <label>Tags</label>
                    </div>
                    {
                      this.props.data.tags && this.props.data.tags.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.tags, (id, index) =>
                          <li key={id}>
                            <a href="#t" className="gray_tag disabled" onClick={this.ignore}>
                              {id}
                            </a>
                          </li>
                        )
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
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
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
                              <a href="#t" className="orange1_tag disabled" onClick={this.ignore}>
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
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
                    <div className="form-group form_style">
                      <label>Excluded Segments</label>
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
                              <a href="#t" className="orange_tag disabled" onClick={this.ignore}>
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
                    { !ro &&
                    <h4 className="edit_txt" style={{zIndex:999, top: '20px'}}>
                      <a href="#b" onClick={this.goBack}>
                        <img alt="pen" src="/img/pen.jpg" />
                        Edit
                      </a>
                    </h4>
                    }
                    <div className="form-group form_style">
                      <label>Excluded Tags</label>
                    </div>
                    {
                      this.props.data.supptags && this.props.data.supptags.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.supptags, (id, index) =>
                          <li key={id}>
                            <a href="#t" className="gray_tag disabled" onClick={this.ignore}>
                              {id}
                            </a>
                          </li>
                        )
                      }
                    </ul>
                  </div>
                </div>
                <div className="space20"></div>
                {
                  this.props.data.last_calc &&
                    <div style={{marginTop: '10px', textAlign: 'center'}}>
                      <InfoBox
                        title="Total Contacts"
                        info={this.props.data.last_calc.count.toLocaleString()}
                        style={{marginLeft: '0'}}
                      />
                      <InfoBox
                        title="Unavailable"
                        info={this.props.data.last_calc.unavailable.toLocaleString()}
                      />
                      <InfoBox
                        title="Suppressed / Excluded"
                        info={this.props.data.last_calc.suppressed.toLocaleString()}
                      />
                      <InfoBox
                        title="Remaining"
                        info={this.props.data.last_calc.remaining.toLocaleString()}
                      />
                    </div>
                }
                <div className="space20"></div>
                <FormGroup style={{position: 'relative'}}>
                  { !ro &&
                  <h4 className="edit_txt ul_edit" style={{zIndex:999, top: (!this.props.data.type || this.props.data.type === 'wysiwyg')?'-30px':undefined}}>
                    <a href="#t" onClick={this.goBackTemplate}>
                      <img alt="pen" src="/img/pen.jpg" />
                      Edit
                    </a>
                  </h4>
                  }
                  {
                    !this.props.data.type?
                      <ReadOnlyTemplateEditor user={this.props.user} data={this.props.data} update={this.props.update} readOnly={true} noPopups={true} />
                    :
                    this.props.data.type === 'beefree' ?
                      <TemplateBeefreeEditor data={this.props.data} update={this.update}
                        readOnly={true} loggedInImpersonate={this.props.loggedInImpersonate}
                        user={this.props.user} nospace />
                      :
                        this.props.data.type === 'raw' ?
                          <TemplateRawEditor data={this.props.data} update={this.props.update} readOnly={true} />
                        :
                          <TemplateWYSIWYGEditor data={this.props.data} update={this.props.update} readOnly={true}
                            loggedInUID={this.props.loggedInUID} loggedInCookie={this.props.loggedInCookie}
                            loggedInImpersonate={this.props.loggedInImpersonate} />
                  }
                </FormGroup>
                <Panel className="space30" id="collapse-panel" defaultExpanded>
                  <Panel.Heading style={{backgroundColor: 'white'}}>
                    <Panel.Title toggle style={{fontSize: '14px'}}>
                      <b>More Options <i className="fa fa-caret-down"/></b>
                    </Panel.Title>
                  </Panel.Heading>
                  <Panel.Collapse>
                    <Panel.Body>
                      <CheckboxLabel
                        id="disableopens"
                        disabled={ro}
                        label="Disable open tracking"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                      <CheckboxLabel
                        id="randomize"
                        disabled={ro || this.props.data.newestfirst}
                        label="Send in random order"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                      <CheckboxLabel
                        id="newestfirst"
                        disabled={ro || this.props.data.randomize}
                        label="Send newest data first"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                    </Panel.Body>
                  </Panel.Collapse>
                </Panel>
                { !ro &&
                <div className="block_btn">
                  <button className="btn_camp grey_btn" type="button" onClick={this.goBack}>Back to broadcast wizard</button>
                  <button className="btn_camp green_btn" type="button" onClick={this.handleSubmit} disabled={this.props.isSaving}>
                  {
                    this.props.data.when === 'draft' ?
                      'Save Broadcast'
                    : (
                      this.props.data.when === 'schedule' ?
                        'Schedule Broadcast'
                        :
                        'Send Broadcast'
                    )
                  }
                  </button>
                </div>
                }
              </section>
            </EDTableSection>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastReview,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/broadcasts/' + id, data),
  extra: {
    lists: async () => _.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()),
    segments: async () => _.sortBy((await axios.get('/api/segments')).data, l => l.name.toLowerCase()),
    supplists: async() => _.sortBy((await axios.get('/api/supplists')).data, l => l.name.toLowerCase()),
    funnels: async() => _.sortBy(_.filter((await axios.get('/api/funnels')).data, f => f.active && f.type === 'responders'), l => l.name.toLowerCase()),
    tags: async() => (await axios.get('/api/recenttags')).data,
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
  },
  extramerge: {
    route: 'routes',
  }
});
