import React, { Component } from "react";
import { Panel, Row, Col, Nav, NavItem } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import _ from "underscore";
import TemplateHeader from "../components/TemplateHeader";
import { EDTabs, EDTableSection, EDFormBox } from "../components/EDDOM";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import Select2 from "react-select2-wrapper";
import { SelectLabel, CheckboxLabel } from "../components/FormControls";
import parse from "../utils/parse";
import qs from "qs";

import "react-select2-wrapper/css/select2.css";

class BroadcastSummarySettings extends Component {
  switchView = url => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push(url + '&' + qs.stringify(p));
  }

  onExit = () => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push('/broadcasts?' + qs.stringify(p));
  }

  ignore = event => {
    event.preventDefault();
  }

  render() {
    var showroute = this.props.routes && _.find(this.props.routes, r => r.id === this.props.data.route);

    var dataName = this.props.data && (this.props.data.name || '')

    return (
      <div>
        <SaveNavbar title={`Broadcast Settings ${dataName ? `for "${dataName}"` : ''}`} onBack={this.onExit} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="4">
                  <NavItem eventKey="1" onClick={this.switchView.bind(null, '/broadcasts/summary?id=' + this.props.id)}>Summary</NavItem>
                  <NavItem eventKey="2" onClick={this.switchView.bind(null, '/broadcasts/heatmap?id=' + this.props.id)}>Heatmap</NavItem>
                  <NavItem eventKey="3" onClick={this.switchView.bind(null, '/broadcasts/domains?id=' + this.props.id)}>Domains</NavItem>
                  <NavItem eventKey="4" disabled>Settings</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
              <section className="campaign">
                { !showroute
                ?
                  null
                :
                <EDFormBox>
                  <div className="form_style">
                    <SelectLabel
                      id="route"
                      label="Send via route:"
                      obj={this.props.data}
                      options={this.props.routes}
                      disabled={true}
                    />
                  </div>
                </EDFormBox>
                }
                <EDFormBox space={showroute} className="campaign_box">
                  <div className="form_style header_box">
                    <TemplateHeader readOnly={true} user={this.props.user} data={this.props.data} update={this.props.update} />
                  </div>
                </EDFormBox>
                <EDFormBox space className="campaign_box summarybox">
                  <label>Tagging</label>
                  <Row>
                    <Col md={6} style={{paddingTop:'6px'}}>
                      <img src="/img/add-tag.png" alt="" style={{marginRight:'10px'}} />
                      {' '}
                      Add tags when a contact <b>opens</b> this message:
                    </Col>
                    <Col md={6}>
                      <Select2
                        multiple
                        disabled
                        data={this.props.data.openaddtags}
                        value={this.props.data.openaddtags}
                        style={{width:'100%'}}
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
                        multiple
                        disabled
                        data={this.props.data.openremtags}
                        value={this.props.data.openremtags}
                        style={{width:'100%'}}
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
                        multiple
                        disabled
                        data={this.props.data.clickaddtags}
                        value={this.props.data.clickaddtags}
                        style={{width:'100%'}}
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
                        multiple
                        disabled
                        data={this.props.data.clickremtags}
                        value={this.props.data.clickremtags}
                        style={{width:'100%'}}
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
                        multiple
                        disabled
                        data={this.props.data.sendaddtags}
                        value={this.props.data.sendaddtags}
                        style={{width:'100%'}}
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
                        multiple
                        disabled
                        data={this.props.data.sendremtags}
                        value={this.props.data.sendremtags}
                        style={{width:'100%'}}
                      />
                    </Col>
                  </Row>
                </EDFormBox>
                <EDFormBox space className="campaign_box">
                  <SelectLabel
                    id="funnel"
                    disabled
                    label="Add openers/clickers to funnel:"
                    obj={this.props.data}
                    options={this.props.funnels}
                    emptyVal="None"
                  />
                </EDFormBox>
                <div className="space20"></div>
                <div className="img_camp">
                  <span>
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img1.jpg" />
                  </span>
                  <div className="campaign_box">
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
                        disabled={true}
                        label="Disable open tracking"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                      <CheckboxLabel
                        id="randomize"
                        disabled={true}
                        label="Send in random order"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                      <CheckboxLabel
                        id="newestfirst"
                        disabled={true}
                        label="Send newest data first"
                        obj={this.props.data}
                        onChange={this.handleChange}
                      />
                    </Panel.Body>
                  </Panel.Collapse>
                </Panel>
              </section>
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastSummarySettings,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  extra: {
    lists: async () => _.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()),
    segments: async () => _.sortBy((await axios.get('/api/segments')).data, l => l.name.toLowerCase()),
    supplists: async() => _.sortBy((await axios.get('/api/supplists')).data, l => l.name.toLowerCase()),
    funnels: async() => _.sortBy((await axios.get('/api/funnels')).data, l => l.name.toLowerCase()),
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
  },
});
