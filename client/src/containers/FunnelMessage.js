import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import { Link } from "react-router-dom";
import WizardNavbar from "../components/WizardNavbar";
import axios from "axios";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import FunnelProgress from "../components/FunnelProgress";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import { Modal, FormControl, Row, Col, Button, SplitButton, MenuItem } from "react-bootstrap";
import TablePie from "../components/TablePie";
import _ from "underscore";
import Datetime from "react-datetime";
import moment from "moment";
import update from "immutability-helper";
import ConfirmButton from "../components/ConfirmButton";
import { SortableContainer, SortableElement, SortableHandle } from "react-sortable-hoc";
import newMessage from "../utils/new-message";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import Toggle from "react-toggle";
import NewTemplate from "../components/NewTemplate";
import { routesHelp } from "../utils/template-utils";

import "../../node_modules/react-datetime/css/react-datetime.css";
import "react-toggle/style.css";
import './FunnelMessage.css';

const DragHandle = SortableHandle(({...p}) => {
  return <img src="/img/toggle.png" style={{cursor:'pointer'}} className={p.className} alt="" />
});

const SortableCard = SortableElement(({...p}) => {
  return <div>
    {p.children}
  </div>
});

const CardList = SortableContainer(({...p}) => {
  return p.children;
});

class FunnelMessage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      newTime: moment().hours(9).minutes(0).seconds(0).format(),
      isSaving: false,
      showFromModal: null,
      fromname: '',
      returnpath: '',
      fromemail: '',
      replyto: '',
      msgroute: '',
      submitCB: null,
    };
  }

  setIsSaving = v => {
    this.setState({isSaving: v});
  }

  setSubmitCB = cb => {
    this.setState({submitCB: cb});
  }

  fixWhen(cb) {
    var p = {};

    _.each(this.props.data.messages, (m, index) => {
      if (m.whennum === '') {
        if (m.whentype === 'days') {
          p[index] = {whennum: {$set: 1}};
        } else {
          p[index] = {whennum: {$set: 0}};
        }
      }
    });

    if (_.size(p)) {
      this.props.update({messages: p}, cb);
    } else {
      cb();
    }
  }

  subjClick = async (msgid, event) => {
    event.preventDefault();

    this.fixWhen(async () => {
      await this.props.save();

      this.props.history.push('/funnels/message/edit?id=' + msgid + '&funnelid=' + this.props.id);
    });
  }

  onStatsClick = async (url, event) => {
    event.preventDefault();

    this.fixWhen(async () => {
      await this.props.save();

      this.props.history.push(url);
    });
  }

  onSortEnd = ({oldIndex, newIndex}) => {
    var tomove = this.props.data.messages[oldIndex];
    
    this.props.update({
      messages: { $splice: [[oldIndex, 1], [newIndex, 0, tomove]] },
    });
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  pctnum(l, n, prop) {
    if (!prop)
      prop = 'send'
    if (!l[prop] || !n)
      return 0;
    var v = (n/l[prop])*100;
    return Math.round(v);
  }

  pct(l, n, prop) {
    if (!prop)
      prop = 'send'
    if (!l[prop] || !n)
      return '0.0%'
    var v = (n/l[prop])*100;
    var r = Math.round(v)
    if (r < 10) {
      return v.toFixed(1) + '%';
    } else {
      return r + '%';
    }
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  modalChange = event => {
    this.setState({[event.target.id]: getvalue(event)});
  }

  onExit = () => {
    this.props.history.push("/funnels");
  }

  onSave = async event => {
    if (event) {
      event.preventDefault();
    }

    this.fixWhen(async () => {
      var m = this.props.data.messages;
      for (var i = 0; i < m.length; i++) {
        if (!m[i].whentime) {
          m = update(m, {[i]: { whentime: { $set: this.state.newTime } } });
        }
      }
      await this.props.save({messages: m});
    });
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.onSave(event);

    this.onExit();
  }

  getMsg(index) {
    if (!this.props.data.messages)
      return {send: 0};
    var id = this.props.data.messages[index].id;
    var m = this.props.messages && this.props.messages[id];
    return m || {send: 0};
  }

  handleMsgChange = (index, event) => {
    this.props.update({messages: {[index]: {[event.target.id]: {$set: getvalue(event)}}}});
  }

  handlePublished = (index, event) => {
    this.props.update({messages: {[index]: {[event.target.id]: {$set: !getvalue(event)}}}});
  }

  handleTimeChange = (index, m) => {
    this.props.update({messages: {[index]: {whentime: {$set: m.format()}}}});
  }

  deleteClicked = async index => {
    this.setState({isSaving: true});
    try {
      this.fixWhen(async () => {
        await axios.delete('/api/messages/' + this.props.data.messages[index].id);

        await this.props.save({
          messages: update(this.props.data.messages, {$splice: [[index, 1]]})
        });
      });
    } finally {
      this.setState({isSaving: false});
    }
    
  }

  duplicateClicked = async index => {
    this.setState({isSaving: true});
    try {
      this.fixWhen(async () => {
        var msgid = (await axios.post('/api/messages/' + this.props.data.messages[index].id + '/duplicate')).data;

        await this.props.reloadExtra();

        var msgdata = _.clone(this.props.data.messages[index]);
        msgdata.id = msgid;
        msgdata.unpublished = true;

        await this.props.save({
          messages: update(this.props.data.messages, {$splice: [[index + 1, 0, msgdata]]})
        });
      });
    } finally {
      this.setState({isSaving: false});
    }
  }

  
  newMsgClicked = legacy => {
    sendGA4Event('Funnels', 'New Message', 'Created New Message');
    this.state.submitCB(null, legacy);
  }

  cancelSubmit = () => {}

  newMsgFinish = (initialize, campType, htmltext, parts, bodyStyle) => {
    this.setState({isSaving: true});
    this.fixWhen(async () => {
      try {
        var msgid = (await axios.post('/api/messages', newMessage(this.props.id, initialize, campType, htmltext, parts, bodyStyle))).data.id;

        await this.props.reloadExtra();

        await this.props.save({
          messages: update(this.props.data.messages, {$push: [{
            id: msgid,
            whennum: 1,
            whentype: 'days',
            whentime: '',
            unpublished: true,
            fromname: this.props.data.fromname,
            returnpath: this.props.data.returnpath,
            fromemail: this.props.data.fromemail,
            replyto: this.props.data.replyto,
            msgroute: '',
          }]})
        });
      } finally {
        this.setState({isSaving: false});
      }
    });
  }

  editFrom = (index) => {
    this.setState({
      showFromModal: index,
      fromname: this.props.data.messages[index].fromname,
      returnpath: this.props.data.messages[index].returnpath,
      fromemail: this.props.data.messages[index].fromemail,
      replyto: this.props.data.messages[index].replyto,
      msgroute: this.props.data.messages[index].msgroute || '',
    });
  }

  fromConfirmClicked = ok => {
    var index = this.state.showFromModal;
    this.setState({showFromModal: null});

    if (ok) {
      this.props.update({messages: {[index]: {
        fromname:   { $set: this.state.fromname },
        returnpath: { $set: this.state.returnpath },
        fromemail:  { $set: this.state.fromemail },
        replyto:    { $set: this.state.replyto },
        msgroute:   { $set: this.state.msgroute },
      }}});
    }
  }

  wizardNavbarButtons = () => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.state.isSaving || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Funnels', 'Saved Funnel', 'Created a Funnel');
          return this.handleSubmit(e);
        }}
        splitItems={[
          { text: 'Exit Without Saving', onClick: this.onExit }
        ]}
      />
    )
  }

  onLinkClick = async url => {
    await this.onSave();

    this.props.history.push(url);
  }

  render() {
    return (
      <div className="funnel-message">
        <LoaderPanel isLoading={this.props.isLoading}>
          <WizardNavbar isSaving={this.state.isSaving || this.props.isSaving}
            link="/funnels"
            buttons={this.wizardNavbarButtons()} user={this.props.user} />
          <EDFormSection onSubmit={this.handleSubmit} className="space-top">
            <NewTemplate setIsSaving={this.setIsSaving} onCancel={this.cancelSubmit}
              isSaving={this.state.isSaving || this.props.isSaving}
              user={this.props.user}
              setSubmitCB={this.setSubmitCB} finishSubmit={this.newMsgFinish} />
            <Modal show={this.state.showFromModal !== null}>
              <Modal.Header>
                <Modal.Title>Edit From Fields</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <FormControlLabel
                  id="fromname"
                  label="From Name"
                  obj={this.state}
                  onChange={this.modalChange}
                />
                <FormControlLabel
                  id="returnpath"
                  label="Sender Email Address"
                  obj={this.state}
                  onChange={this.modalChange}
                  space
                />
                <FormControlLabel
                  id="fromemail"
                  label="From Email"
                  obj={this.state}
                  onChange={this.modalChange}
                  space
                />
                <FormControlLabel
                  id="replyto"
                  label="Reply-To Email"
                  obj={this.state}
                  onChange={this.modalChange}
                  space
                />
              { !this.props.routes
                ?
                  null
                :
                <SelectLabel
                  id="msgroute"
                  label="Send via Route:"
                  obj={this.state}
                  onChange={this.modalChange}
                  options={this.props.routes}
                  emptyVal="Default (Funnel Setting)"
                  help={routesHelp(this.props.routes)}
                  space
                />
              }
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={this.fromConfirmClicked.bind(this, true)} bsStyle="primary"
                  disabled={!this.state.fromname || !this.state.returnpath}>
                  OK
                </Button>
                <Button onClick={this.fromConfirmClicked.bind(this, false)}>Cancel</Button>
              </Modal.Footer>
            </Modal>
            <FunnelProgress active={2} id={this.props.id} onClick={this.onLinkClick} />
            <CardList onSortEnd={this.onSortEnd} useDragHandle={true}>
              <fieldset>
                <div className="campaign meassage_box" style={{width: '850px', margin: 'auto'}}>
                  <Row className="flex-items">
                    <Col xs={9}>
                      <div className="frst-msg form-inline">
                        <span style={{marginBottom: '8px', display: 'inline-block'}}>
                          How soon do you want the first message sent when someone enters this funnel?
                        </span>
                        {' '}
                        <FormControl id="whennum" type="number" min="0" value={this.props.data.messages[0].whennum} onChange={this.handleMsgChange.bind(null, 0)} style={{width:'80px', display: 'inline-block'}}/>
                        {' '}
                        <FormControl componentClass="select" id="whentype" value={this.props.data.messages[0].whentype} onChange={this.handleMsgChange.bind(null, 0)} style={{width:'100px', display: 'inline-block'}}>
                          <option value="mins">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </FormControl>
                        {
                          this.props.data.messages[0].whentype === 'days' &&
                          <span>
                            {' '}at{' '}
                            <Datetime value={moment(this.props.data.messages[0].whentime||this.state.newTime)} onChange={this.handleTimeChange.bind(null, 0)} dateFormat={null} inputProps={{style: {width:'100px'}}}/>
                          </span>
                        }
                        {' '}
                      </div>
                    </Col>
                    <Col xs={3} className="text-right">
                      <div className="space20 visible-xs"/>
                      <SplitButton
                        id="new-message"
                        title="New Message"
                        bsStyle=""
                        disabled={this.state.isSaving}
                        className="btn_camp green_btn green next m0"
                        onClick={() => this.newMsgClicked(!this.props.user.hasbeefree)}
                        >
                        {
                          this.props.user.hasbeefree &&
                          <MenuItem onClick={() => this.newMsgClicked(true)}>New Message (Legacy Editor)</MenuItem>
                        }
                      </SplitButton>
                    </Col>
                  </Row>
                </div>
              {
                _.map(this.props.data.messages, (m, index) => {
                  var msg = this.getMsg(index);

                  return (
                    <div key={m.id} style={{position: 'relative', display: 'flex', justifyContent: 'center'}}>
                      <SortableCard index={index}>
                        {
                          index > 0 &&
                          <div className="space30" />
                        }
                        <div style={{display: 'flex'}}>
                          <EDFormBox className="msg-box" style={{ width: '850px' }}>
                            {
                              index === 0 &&
                              <Row>
                                <Col md={7} sm={10}>
                                  <h4>
                                    <DragHandle />
                                    Subject:{' '}
                                    <a className="subj-link" href={'/funnels/message/edit?id=' + msg.id + '&funnelid=' + this.props.id} onClick={this.subjClick.bind(null, msg.id)}>
                                      {msg.subject}
                                    </a>
                                  </h4>
                                </Col>
                                <Col md={5} sm={2} className="text-right">
                                  <Button disabled={this.state.isSaving} onClick={this.duplicateClicked.bind(null, index)}>
                                    <img src="/img/folder.png" alt="" />
                                  </Button>
                                </Col>
                              </Row>
                            }
                            {index > 0 &&
                              <Row className="form-inline">
                                <Col xs={9}>
                                  <DragHandle className="pr-10" />
                                  Wait
                                  {' '}
                                  <FormControl id="whennum" type="number" min="1" value={this.props.data.messages[index].whennum} onChange={this.handleMsgChange.bind(null, index)} style={{width: '80px'}} />
                                  {' '}
                                  <FormControl componentClass="select" id="whentype" value={this.props.data.messages[index].whentype} onChange={this.handleMsgChange.bind(null, index)}>
                                    <option value="mins">Minutes</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                  </FormControl>
                                  {
                                    this.props.data.messages[index].whentype === 'days' &&
                                    <span>
                                      {' '}at{' '}
                                      <Datetime value={moment(this.props.data.messages[index].whentime || this.state.newTime)} onChange={this.handleTimeChange.bind(null, index)} dateFormat={null} inputProps={{style: {width: '100px'}}} />
                                    </span>
                                  }
                                  {' '}
                                  before sending this message
                                </Col>
                                <Col xs={3} className="text-right">
                                  <ConfirmButton
                                    className="delete-button"
                                    disabled={this.state.isSaving}
                                    title="Delete Message Confirmation"
                                    extra={true}
                                    prompt={`Are you sure you wish to delete '${msg.subject}'?`}
                                    onConfirm={this.deleteClicked.bind(null, index)}
                                    text={<i className="fa fa-trash" />}
                                  />
                                  <Button style={{ marginLeft: '6px' }} disabled={this.state.isSaving} onClick={this.duplicateClicked.bind(null, index)}>
                                    <img src="/img/folder.png" alt="" />
                                  </Button>
                                </Col>
                              </Row>
                            }
                            {
                              index > 0 &&
                              <h4 className="space30 pl-30">
                                Subject:{' '}
                                <a className="subj-link" href={'/funnels/message/edit?id=' + msg.id + '&funnelid=' + this.props.id} onClick={this.subjClick.bind(null, msg.id)}>
                                  {msg.subject}
                                </a>
                              </h4>
                            }
                            <div className="ed-table no-border">
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Contacts</th>
                                    <th>Opened</th>
                                    <th>CTR</th>
                                    <th>Unsubscribed</th>
                                    <th>Complaints</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <ul className="list-inline first-tr">
                                        <li>
                                          <h4>{msg.send.toLocaleString()}</h4>
                                        </li>
                                      </ul>
                                    </td>
                                    <td>
                                      <ul className="list-inline m0">
                                        <li className="graph-container center-over-graph">
                                          <TablePie value={this.pctnum(msg, msg.opened)} size={60} thickness={7} color="#2dcca1" />
                                        </li>
                                        <li className="graph-caption">
                                          <h5 className="green-perc">{this.pct(msg, msg.opened)}</h5>
                                          <p>{this.num(msg.opened)}</p>
                                        </li>
                                      </ul>
                                    </td>
                                    <td>
                                      <ul className="list-inline m0">
                                        <li className="graph-container center-over-graph">
                                          <TablePie value={this.pctnum(msg, msg.clicked, 'opened')} size={60} thickness={7} color="#4b7efe" />
                                        </li>
                                        <li className="graph-caption">
                                          <h5 className="blue-perc">{this.pct(msg, msg.clicked, 'opened')}</h5>
                                          <p>{this.num(msg.clicked)}</p>
                                        </li>
                                      </ul>
                                    </td>
                                    <td>
                                      <ul className="list-inline m0">
                                        <li className="graph-container center-over-graph">
                                          <TablePie value={this.pctnum(msg, msg.unsubscribed)} size={60} thickness={7} color="#fec400" />
                                        </li>
                                        <li className="graph-caption">
                                          <h5 className="red-perc">{this.pct(msg, msg.unsubscribed)}</h5>
                                          <p>{this.num(msg.unsubscribed)}</p>
                                        </li>
                                      </ul>
                                    </td>
                                    <td>
                                      <ul className="list-inline m0">
                                        <li className="graph-container center-over-graph">
                                          <TablePie value={this.pctnum(msg, msg.complained)} size={60} thickness={7} color="#f46767" />
                                        </li>
                                        <li className="graph-caption">
                                          <h5 className="red-perc">{this.pct(msg, msg.complained)}</h5>
                                          <p>{this.num(msg.complained)}</p>
                                        </li>
                                      </ul>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <hr style={{ marginTop: '25px' }} />
                            <Row className="flex-items form-inline">
                              <Col md={5} sm={4}>
                                {
                                  index > 0 &&
                                  <div style={{ fontSize: '14px', color: '#8b94a4', marginTop: '-15px' }}>
                                    <i className="fa fa-paper-plane" />
                                    {' '}
                                    {
                                      {
                                        all: 'Everyone',
                                        openany: 'Openers or Clickers of Any Message',
                                        openlast: 'Openers or Clickers of Last Message',
                                        clickany: 'Clickers of Any Message',
                                        clicklast: 'Clickers of Last Message',
                                      }[msg.who] || 'Invalid'
                                    }
                                  </div>
                                }
                              </Col>
                              <Col md={3} sm={4}>
                                {index > 0 &&
                                  <Toggle
                                    checked={!this.props.data.messages[index].unpublished}
                                    id="unpublished"
                                    onChange={this.handlePublished.bind(null, index)}
                                  />
                                }
                                {index > 0 &&
                                  <div style={{
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    paddingBottom: '15px',
                                    paddingLeft: '10px',
                                  }}>
                                    Published
                                  </div>
                                }
                              </Col>
                              <Col md={4} sm={4}>
                                <p className="text-right friendly-txt">
                                  From Name: {this.props.data.messages[index].fromname}
                                  {' '}
                                  <a href="#e" onClick={this.editFrom.bind(null, index)}>
                                    <img src="/img/pencil.png" alt="" />
                                  </a>
                                </p>
                              </Col>
                            </Row>
                          </EDFormBox>
                          <Link to={'/funnels/message/stats?id=' + msg.id + '&funnelid=' + this.props.id}
                            onClick={this.onStatsClick.bind(null, '/funnels/message/stats?id=' + msg.id + '&funnelid=' + this.props.id)}
                            style={{
                              textAlign: 'center',
                              fontSize: '16px',
                              color: '#555555',
                              alignSelf: 'center',
                              paddingLeft: '32px',
                              whiteSpace: 'nowrap',
                            }}>
                            View Reporting <i className="fa fa-bar-chart" style={{marginLeft: '10px'}}></i>
                          </Link>
                        </div>
                      </SortableCard>
                    </div>
                  );
                })
              }
              </fieldset>
            </CardList>
          </EDFormSection>
        </LoaderPanel>
      </div>
    );
  }
}

export default withLoadSave({
  initial: { messages: [{send: 0, id: 'tmp'}] },
  extend: FunnelMessage,
  get: async ({id}) => (await axios.get('/api/funnels/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/funnels/' + id, data),
  extra: {
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
    messages: async ({id}) => {
      var msgs = (await axios.get('/api/funnels/' + id + '/messages')).data;

      var msgd = {};
      msgs.forEach(m => {
        msgd[m.id] = m;
      });

      return msgd;
    },
  }
});