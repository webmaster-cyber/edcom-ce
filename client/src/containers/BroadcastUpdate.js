import React, { Component } from "react";
import { Panel, FormGroup, Modal, Button, Row, Col } from "react-bootstrap";
import { FormControlLabel, SelectLabel, CheckboxLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import getvalue from "../utils/getvalue";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import _ from "underscore";
import TemplateHeader from "../components/TemplateHeader";
import TemplateEditor from "../components/TemplateEditor";
import TemplateRawEditor from "../components/TemplateRawEditor";
import TemplateWYSIWYGEditor from "../components/TemplateWYSIWYGEditor";
import TemplateBeefreeEditor from "../components/TemplateBeefreeEditor";
import { EDTableSection, EDFormBox } from "../components/EDDOM";
import fixTag from "../utils/fixtag";
import Select2 from "react-select2-wrapper";
import LoaderButton from "../components/LoaderButton";

import "react-select2-wrapper/css/select2.css";

import "../../node_modules/react-datetime/css/react-datetime.css";

class BroadcastUpdate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showConfirm: false,
      isSaving: false,
      dataName: '',
    };

    this._saveCB = null;

    props.setLoadedCB(this.loadedCB);
  }

  loadedCB = () => {
    this.setState({dataName: this.props.data.name});
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

  handleChange = async event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  handleSubmit = async event => {
    event.preventDefault();

    this.setState({showConfirm: true});
  }

  confirmClicked = async yes => {
    this.setState({showConfirm: false, isSaving: yes});

    if (!yes) {
      return;
    }

    if (this._saveCB) {
      await this._saveCB();
    }

    var finished = this.props.data.finished_at;
    var p;
    if (finished) {
      p = _.pick(this.props.data,
        'name',
        'openaddtags', 'openremtags', 'clickaddtags', 'clickremtags', 'sendaddtags', 'sendremtags',
        'funnel'
      );
    } else {
      p = _.pick(this.props.data,
        'name', 'subject', 'fromname', 'returnpath', 'fromemail', 'replyto',
        'parts', 'bodyStyle', 'rawText', 'preheader',
        'openaddtags', 'openremtags', 'clickaddtags', 'clickremtags', 'sendaddtags', 'sendremtags',
        'funnel'
      );
    }

    try {
      await axios.post('/api/broadcasts/' + this.props.id + '/update', p);
    } finally {
      this.setState({isSaving: false});
    }

    this.props.history.push('/broadcasts');
  }

  goBack = async event => {
    event.preventDefault();

    this.props.history.push('/broadcasts');
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="bc-buttons-dropdown"
        text="Update Broadcast"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving || this.state.isSaving}
        onClick={this.props.formSubmit.bind(null, true)}
        splitItems={[
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var finished = this.props.data.finished_at;

    var dataName = this.state.dataName;
    var title;
    if (!dataName) {
      title = 'Update Broadcast';
    } else {
      title = `Update ${finished ? '' : 'Running'} Broadcast ${dataName ? dataName : ''}`;
    }

    return (
      <div className="review">
        <SaveNavbar title={title} onBack={this.goBack} buttons={this.navbarButtons()}
                    isSaving={this.props.isSaving || this.state.isSaving} id={this.props.id}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDTableSection>
              <form onSubmit={this.handleSubmit} ref={this.props.formRef}>
                <button type="submit" style={{display:'none'}} />
                <Modal show={this.state.showConfirm}>
                  <Modal.Header>
                    <Modal.Title>Update Confirmation</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    {
                      finished ?
                        <p>Are you sure you wish to update this sent broadcast?</p>
                      :
                        <p>Are you sure you wish to attempt to update queued mail for this broadcast? This will reset the click counts on your heatmap.</p>
                    }
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
                    <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
                  </Modal.Footer>
                </Modal>
                <section className="campaign">
                  <EDFormBox space className="campaign_box">
                    <div className="form_style">
                      <FormControlLabel
                        id="name"
                        label="Broadcast Name"
                        obj={this.props.data}
                        onChange={this.handleChange}
                        required={true}
                      />
                    </div>
                  </EDFormBox>
                  { !finished &&
                  <EDFormBox space className="campaign_box">
                    <div className="form_style header_box">
                      <TemplateHeader user={this.props.user} data={this.props.data} update={this.props.update} fields={this.props.allfields} />
                    </div>
                  </EDFormBox>
                  }
                  { !finished &&
                  <div className="space20"></div>
                  }
                  { !finished &&
                  <FormGroup className={!this.props.data.type?'space40':''}>
                    {
                      this.props.data.type !== 'raw' &&
                      <Row>
                        <Col md={6} sm={6}>
                          <FormControlLabel
                            id="preheader"
                            label="Preview text pre-header (optional)"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                        </Col>
                      </Row>
                    }
                    {
                      !this.props.data.type?
                        <TemplateEditor user={this.props.user} data={this.props.data} update={this.props.update} fields={this.props.allfields} />
                      :
                      this.props.data.type === 'beefree' ?
                        <TemplateBeefreeEditor data={this.props.data} update={this.update}
                          onChange={() => {}}
                          setSaveCB={cb => this._saveCB = cb}
                          fields={this.props.allfields} loggedInImpersonate={this.props.loggedInImpersonate}
                          user={this.props.user} />
                        :
                          this.props.data.type === 'raw' ?
                            <TemplateRawEditor data={this.props.data} update={this.props.update} fields={this.props.allfields} />
                          :
                            <TemplateWYSIWYGEditor data={this.props.data} update={this.props.update} fields={this.props.allfields}
                              loggedInUID={this.props.loggedInUID} loggedInCookie={this.props.loggedInCookie}
                              loggedInImpersonate={this.props.loggedInImpersonate} />
                    }
                  </FormGroup>
                  }
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
                  <EDFormBox space className="campaign_box">
                    <SelectLabel
                      id="funnel"
                      label="Add openers/clickers to funnel:"
                      obj={this.props.data}
                      onChange={this.handleChange}
                      options={this.props.funnels}
                      emptyVal="None"
                    />
                  </EDFormBox>
                  { !finished &&
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
                            label="Disable open tracking"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                          <CheckboxLabel
                            id="randomize"
                            disabled={this.props.data.newestfirst}
                            label="Send in random order"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                          <CheckboxLabel
                            id="newestfirst"
                            disabled={this.props.data.randomize}
                            label="Send newest data first"
                            obj={this.props.data}
                            onChange={this.handleChange}
                          />
                        </Panel.Body>
                      </Panel.Collapse>
                    </Panel>
                  }
                </section>
              </form>
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastUpdate,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  extra: {
    funnels: async () => _.sortBy((await axios.get('/api/funnels')).data, l => l.name.toLowerCase()),
    tags: async () => (await axios.get('/api/recenttags')).data,
    allfields: async () => (await axios.get('/api/allfields')).data,
  },
});
