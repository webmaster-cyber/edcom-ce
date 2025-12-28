import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderIcon from "../components/LoaderIcon";
import getvalue from "../utils/getvalue";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import BroadcastNavbar from "../components/BroadcastNavbar";
import _ from "underscore";
import delay from "timeout-as-promise";
import InfoBox from "../components/InfoBox";
import notify from "../utils/notify";
import parse from "../utils/parse";
import { EDFormSection } from "../components/EDDOM";
import ScrollToTop from "../components/ScrollToTop";
import Select2 from "react-select2-wrapper";

import "react-select2-wrapper/css/select2.css";

class BroadcastRcpt extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    this._addSupp = null;
    if (p.suppid) {
      this._addSupp = p.suppid;
    }

    this.state = {
      calculating: false,
      showConfirm: false,
    };
  }

  onLinkClick = async url => {
    await this.props.save();

    this.props.history.push(url);
  }

  handleChange = async event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  saveAndExit = async () => {
    var ro = !!this.props.data.sent_at;

    if (!ro) {
      await this.props.save();
    }

    this.props.history.push('/broadcasts');
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (!this.validateForm() || this.props.isSaving) {
      return;
    }

    var ro = !!this.props.data.sent_at;

    if (!ro) {
      await this.props.save();
    }

    this.props.history.push('/broadcasts/review?id=' + this.props.id);
  }

  calcSupp = () => {
    if (!this.validateForm()) {
      return;
    }

    this.props.update({last_calc: {$set: null}}, () => {
      this.setState({calculating: true}, async () => {
        try {
          await this.props.save();

          var id = (await axios.post('/api/broadcasts/' + this.props.id + '/calculate')).data.id;

          while (true) {
            await delay(5000);
            
            var results = (await axios.get('/api/broadcastcalculate/' + id)).data;

            if (results.error) {
              notify.show(results.error, "error");
              break;
            } else if (results.complete) {
              this.props.update({last_calc: {$set: {suppressed: results.suppressed,
                                                    remaining: results.remaining,
                                                    unavailable: results.unavailable,
                                                    count: results.count}}});
              break;
            }
          }
        } finally {
          setTimeout(() => this.setState({calculating: false}));
        }
      });
    });
  }

  uploadClicked = async event => {
    event.preventDefault();

    if (this.props.isSaving)
      return;

    const ro = !!this.props.data.sent_at;
    if (!ro)
      await this.props.save();

    this.props.history.push('/suppression/new?bcid=' + this.props.id);
  }

  addSelectItem = (prop, event) => {
    if (!_.find(this.props.data[prop], t => t === event.params.data.id))
      this.props.update({[prop]: {$push: [event.params.data.id]}, last_calc: {$set: null}});
  }

  removeItem = (prop, index) => {
    const ro = !!this.props.data.sent_at;

    if (ro || this.state.calculating)
      return;

    this.props.update({[prop]: {$splice: [[index, 1]]}, last_calc: {$set: null}});
  }

  validateForm() {
    if  (!((this.props.data.lists && this.props.data.lists.length) ||
          (this.props.data.segments && this.props.data.segments.length) ||
          (this.props.data.tags && this.props.data.tags.length))) {
      notify.show("Please add a contact list, segment or tag", "error");
      return false;
    }
    return true;
  }

  componentDidUpdate() {
    if (this.props.data.supplists && this._addSupp) {
      this.props.update({supplists: {$push: [this._addSupp]}});
      this._addSupp = null;
    }
  }

  wizardNavbarButtons = (ro) => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text={ro ? 'Exit' : 'Review Broadcast'}
        loadingText="Saving..."
        className="green"
        onClick={this.handleSubmit}
        splitItems={[
          { text: 'Edit Settings', onClick: this.onLinkClick.bind(null, '/broadcasts/settings?id=' + this.props.id) },
          { text: 'Save and Exit', onClick: this.saveAndExit },
          { text: 'Exit', onClick: () => { this.props.history.push('/broadcasts') } },
        ]}
      />
    )
  }

  render() {
    const ro = !!this.props.data.sent_at;

    var listitems = _.map(_.filter(this.props.lists, l => !_.find(this.props.data.lists, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var segitems = _.map(_.filter(this.props.segments, l => !_.find(this.props.data.segments, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var tagitems = _.map(_.filter(this.props.tags, l => !_.find(this.props.data.tags, id => id === l)), t => ({id: t, text: t}));
    var supplistitems = _.map(_.filter(this.props.supplists, l => !_.find(this.props.data.supplists, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var suppsegitems = _.map(_.filter(this.props.segments, l => !_.find(this.props.data.suppsegs, id => id === l.id)), l => ({id: l.id, text: l.name}));
    var supptagitems = _.map(_.filter(this.props.tags, l => !_.find(this.props.data.supptags, id => id === l)), t => ({id: t, text: t}));

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <BroadcastNavbar green={!ro} user={this.props.user} isSaving={this.props.isSaving}
          link={'/broadcasts/template?id=' + this.props.id}
          onLinkClick={this.onLinkClick}
          backText="Design Your Email"
          buttons={this.wizardNavbarButtons(ro)}/>
          <EDFormSection onSubmit={this.handleSubmit}>
            {
              _.find(this.props.lists, l => l.unapproved) &&
              <p>Your account contains data that is not yet approved. Messages will not be sent to unapproved recipients, even if they are added here.</p>
            }
            {
            this.props.lists && this.props.lists.length ?
              <div className="campaign meassage_box meassage_box1">
                <div className="space20"></div>
                <div className="img_camp">
                  <span>
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img1.jpg" />
                  </span>
                  <div className="campaign_box">
                    <div className="edit_txt">
                      <Select2
                        disabled={ro || this.state.calculating || !listitems.length}
                        data={listitems}
                        value=""
                        onSelect={this.addSelectItem.bind(null, 'lists')}
                        style={{width:'180px'}}
                        options={{
                          placeholder: 'Add List'
                        }}
                      />
                    </div>
                    <div className="form-group form_style">
                      <label>Contact Lists</label>
                    </div>
                    {
                      this.props.data.lists.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.lists, (id, index) => {
                          var l = _.find(this.props.lists, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className={'green_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'lists', index)}>
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
                    <div className="edit_txt">
                      <Select2
                        disabled={ro || this.state.calculating || !segitems.length}
                        data={segitems}
                        value=""
                        onSelect={this.addSelectItem.bind(null, 'segments')}
                        style={{width:'180px'}}
                        options={{
                          placeholder: 'Add Segment'
                        }}
                      />
                    </div>
                    <div className="form-group form_style">
                      <label>Segments</label>
                    </div>
                    {
                      this.props.data.segments.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.segments, (id, index) => {
                          var l = _.find(this.props.segments, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className={'orange_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'segments', index)}>
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
                    <div className="edit_txt">
                      <Select2
                        disabled={ro || this.state.calculating || !tagitems.length}
                        data={tagitems}
                        value=""
                        onSelect={this.addSelectItem.bind(null, 'tags')}
                        style={{width:'180px'}}
                        options={{
                          placeholder: 'Add Tag'
                        }}
                      />
                    </div>
                    <div className="form-group form_style">
                      <label>Tags</label>
                    </div>
                    {
                      (!this.props.data.tags || this.props.data.tags.length === 0) && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.tags, (id, index) =>
                          <li key={id}>
                            <a href="#t" className={'gray_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'tags', index)}>
                              {id}
                            </a>
                          </li>
                        )
                      }
                    </ul>
                  </div>
                </div>
                <div className="suppression">
                  <h2>Suppression and Exclusion</h2>
                  {
                    this.props.data.is_resend &&
                    <h5>Openers of a previous broadcast are excluded from this broadcast</h5>
                  }
                </div>
                <div className="img_camp">
                  <span>
                    <img className="img-responsive icon_img1" alt="icon_img1" src="/img/icon_img2.jpg" />
                  </span>
                  <div className="campaign_box">
                    <div className="edit_txt">
                      <Select2
                        disabled={ro || this.state.calculating || !supplistitems.length}
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
                      this.props.data.supplists.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.supplists, (id, index) => {
                          var l = _.find(this.props.supplists, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className={'orange1_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'supplists', index)}>
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
                        disabled={ro || this.state.calculating || !suppsegitems.length}
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
                      this.props.data.suppsegs.length === 0 && <p className="text-center">None Selected</p>
                    }
                    <ul className="list-inline color_tag">
                      {
                        _.map(this.props.data.suppsegs, (id, index) => {
                          var l = _.find(this.props.segments, l => l.id === id);
                          return (
                            <li key={id}>
                              <a href="#t" className={'orange_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'suppsegs', index)}>
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
                        disabled={ro || this.state.calculating || !supptagitems.length}
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
                            <a href="#t" className={'gray_tag ' + ((ro || this.state.calculating)?'disabled':'')} onClick={this.removeItem.bind(null, 'supptags', index)}>
                              {id}
                            </a>
                          </li>
                        )
                      }
                    </ul>
                  </div>
                </div>
                <div className="space20"></div>
                { !ro &&
                <div className="text-center">
                  <Button bsStyle="primary" onClick={this.calcSupp} className="btn-blue-background"
                          disabled={this.state.calculating || ro}>
                    Calculate Suppression
                  </Button>
                  {
                    this.props.data.last_calc && !this.state.calculating &&
                      <div style={{marginTop: '10px'}}>
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
                  {
                    this.state.calculating &&
                      <div className="space10">
                        <LoaderIcon/>
                      </div>
                  }
                </div>
                }
                { !ro &&
                  <LoaderButton
                    isLoading={this.props.isSaving}
                    type="submit"
                    className="next action-button"
                    text="Review Broadcast"
                    loadingText="Saving..."
                  />
                }
              </div>
            :
              <h4 className="text-center space-top">
                No contact lists are configured. You will need to <Link to="/contacts/edit?id=new">create a contact list</Link> before you can send a broadcast.
              </h4>
          }
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastRcpt,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/broadcasts/' + id, data),
  extra: {
    lists: async () => _.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()),
    segments: async () => _.sortBy((await axios.get('/api/segments')).data, l => l.name.toLowerCase()),
    supplists: async() => _.sortBy((await axios.get('/api/supplists')).data, l => l.name.toLowerCase()),
    tags: async() => (await axios.get('/api/recenttags')).data,
  },
});
