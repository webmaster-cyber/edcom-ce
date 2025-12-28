import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import { FormControlLabel } from "../components/FormControls";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import _ from "underscore";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import SegmentEditor from "../components/SegmentEditor";
import checkSegment from "../utils/check-segment";
import notify from "../utils/notify";

function fix_segment_rule(r) {
  if (r.type === 'Lists') {
    if (r.campaign) {
      r.broadcast = r.campaign;
      delete r.campaign;
    }
    if (r.defaultcampaign) {
      r.defaultbroadcast = r.defaultcampaign;
      delete r.defaultcampaign;
    }
  } else if (r.type === 'Group') {
    r.parts.forEach(fix_segment_rule);
  }
}

function fix_segment(s) {
  s.parts.forEach(fix_segment_rule);
  return s;
}

function ifEmpty(v, e) {
  if (!v || !v.length)
    return e;
  return v;
}

class Segment extends Component {
  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    if (this.props.data.parts.length === 0) {
      notify.show("Please add one or more rules", "error");
      return;
    }
    if (!checkSegment(this.props.data)) {
      notify.show("Cannot save segment, one or more required fields are empty", "error");
      return;
    }

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push('/segments');
  }

  onChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}});
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="warmup-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={() => { 
            sendGA4Event('Segments', 'Saved Segment', 'Saved a Segment'); 
            return this.props.formSubmit(true);
        }}
        splitItems={[
          { text: 'Save', onClick: () => { 
              sendGA4Event('Segments', 'Saved Segment', 'Saved a Segment'); 
              return this.props.formSubmit();
          }},
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    );
  }



  render() {
    let dataName = this.props.data && (this.props.data.name || '');
    let title = this.props.id === 'new' ? 'Create Segment' : `Edit Segment ${dataName ? `for "${dataName}"` : ''}`;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar title={title} user={this.props.user} isSaving={this.props.isSaving}
          onBack={this.goBack} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.onChange}
                required={true}
              />
              <SegmentEditor data={this.props.data} update={this.props.update} lists={this.props.lists} fields={this.props.allfields}
                segments={this.props.segments} campaigns={this.props.campaigns} tags={this.props.tags} countries={this.props.countries}
                regions={this.props.regions} />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: Segment,
  initial: {
    name: '',
    parts: [],
    operator: 'and',
    subset: false,
    subsetsort: '',
    subsettype: 'percent',
    subsetpct: 10,
    subsetnum: 2000,
  },
  extra: {
    lists: async () => ifEmpty(_.map(_.sortBy((await axios.get('/api/lists')).data, l => l.name.toLowerCase()), l => ({id: l.id, text: l.name})), [{id: '', text: 'None Available'}]),
    segments: async ({id}) => ifEmpty(_.map(_.sortBy(_.filter((await axios.get('/api/segments')).data, s => s.id !== id), s => s.name.toLowerCase()), s => ({id: s.id, text: s.name})), [{id: '', name: 'None Available'}]),
    campaigns: async ({id}) => _.map((await axios.get('/api/recentbroadcasts?segid=' + id)).data, c => ({id: c.id, text: c.name, linkurls: c.linkurls, is_bc: c.is_bc, updated_at: c.updated_at, modified: c.modified})),
    tags: async () => (await axios.get('/api/recenttags')).data,
    countries: async () => (await axios.get('/api/countries')).data,
    regions: async () => (await axios.get('/api/regions')).data,
    allfields: async () => (await axios.get('/api/allfields')).data,
  },
  get: async ({id}) => fix_segment((await axios.get('/api/segments/' + id)).data),
  patch: ({id, data}) => axios.patch('/api/segments/' + id, data),
  post: ({data}) => axios.post('/api/segments', data),
});
