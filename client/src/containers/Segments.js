import React, { Component } from "react";
import { Modal, Button, MenuItem, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import { EDCardsContainer, EDCard } from "../components/EDDOM";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import notify from "../utils/notify";
import SearchControl from "../components/SearchControl";
import fixTag from "../utils/fixtag";
import getvalue from "../utils/getvalue";
import Select2 from "react-select2-wrapper";

import "react-select2-wrapper/css/select2.css";
import './Segments.css';

class Segments extends Component {
  state = {
    searchTerm: '',
    filteredSegments: [].concat(this.props.data),
    showTagModal: null,
    untag: false,
    tagging: false,
    tags: [],
    tagName: '',
  }

  createClicked = () => {
    this.props.history.push("/segments/edit?id=new");
  }

  tagData() {
    if (!this.props.tags)
      return [];
    return this.props.tags;
  }

  onTagChange = event => {
    setTimeout(() => {
      this.setState({[event.target.id]: getvalue(event)});
    });
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/segments/' + id);
    await this.props.reload();
  }

  duplicateClicked = async id => {
    await axios.post('/api/segments/' + id + '/duplicate');
    await this.props.reload();
  }

  tagClicked = id => {
    this.setState({tags: [], showTagModal: id, tagName: _.find(this.props.data, s => s.id === id).name, untag: false});
  }

  untagClicked = id => {
    this.setState({tags: [], showTagModal: id, tagName: _.find(this.props.data, s => s.id === id).name, untag: true});
  }

  tagClose = async ok => {
    var id = this.state.showTagModal;

    this.setState({showTagModal: null});

    if (!ok) {
      return;
    }

    if (this.state.untag) {
      await axios.post('/api/segments/' + id + '/tag', {
        removetags: this.state.tags,
      });
      notify.show("Untag request submitted", "success");
    } else {
      await axios.post('/api/segments/' + id + '/tag', {
        tags: this.state.tags,
      });
      notify.show("Tag request submitted", "success");
    }
  }

  exportClicked = async id => {
    await axios.post('/api/segments/' + id + '/export');

    notify.show('Download your export file from the Data Exports page', "success");
  }

  componentDidMount() {
    this._interval = setInterval(() => {
      if (_.find(this.props.data, l => !_.isNumber(l.count) && l.count.startsWith("Loading"))) {
        this.props.reload();
      }
    }, 10000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({filteredSegments: [].concat(nextProps.data)})
  }

  filterSegmentsList = (searchTerm) => {
    this.setState({
      searchTerm: searchTerm,
      filteredSegments: this.props.data.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    })
  }

  render() {
    return (
      <div className="segments">
        <MenuNavbar {...this.props}>
        <TitlePage title="Segments" button={
          <Button bsStyle="primary" onClick={this.createClicked}>Create Segment</Button>
        } />
        <LoaderPanel isLoading={this.props.isLoading}>
          {this.props.data.length > 0 ?
            <div>
              <div className="pull-right" style={{paddingTop: '8px', paddingBottom: '8px', paddingRight: '49px'}}>
                <SearchControl onChange={this.filterSegmentsList} value={this.state.searchTerm}/>
              </div>
              <Modal show={this.state.showTagModal !== null}>
                <Modal.Header>
                  <Modal.Title>
                    {
                      this.state.untag ?
                      'Untag Segment'
                      :
                      'Tag Segment'
                    }
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <h5>Enter tags to {this.state.untag?'remove':'add'} to all the contacts in "{this.state.tagName}"</h5>
                  <Select2
                    id="tags"
                    multiple
                    value={this.state.tags}
                    data={this.props.tags}
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
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={this.tagClose.bind(this, true)} bsStyle="primary" disabled={this.state.tagging}>
                    {
                      this.state.untag ? 'Remove' : 'Add'
                    }
                  </Button>
                  <Button onClick={this.tagClose.bind(this, false)}>Cancel</Button>
                </Modal.Footer>
              </Modal>
              <EDCardsContainer>
                {this.state.filteredSegments.map((s, index) => (
                  <EDCard key={s.id} header={
                    <div>
                      <span className="pre-title">SEGMENT</span>
                      <h3 className="segment-name">
                        <Link to={'/segments/edit?id=' + s.id}>
                          {s.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        {typeof s.count === 'number' ?
                          <div className="circle">
                            <div className="content">
                              <span className="count">{_.isNumber(s.count)?s.count.toLocaleString():s.count}</span>
                              <span className="caption">{
                              _.isNumber(s.count) && s.count === 1 ?
                              'CONTACT' : 'CONTACTS'
                              }</span>
                            </div>
                          </div>
                          :
                          <p className="count-error-message" style={{height: '140px', paddingTop: '45px'}}>
                            {s.count.toLocaleString()}
                          </p>
                        }
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={s.id + '-split'}
                          text="Actions"
                          extra={true}
                          menu="Delete"
                          title="Delete Segment Confirmation"
                          prompt={`Are you sure you wish to delete '${s.name}'?`}
                          onConfirm={this.deleteConfirmClicked.bind(this, s.id)}>
                          <MenuItem onClick={() => this.props.history.push('/segments/edit?id=' + s.id)}>Edit</MenuItem>
                          <MenuItem onClick={this.tagClicked.bind(this, s.id)}>Tag</MenuItem>
                          <MenuItem onClick={this.untagClicked.bind(this, s.id)}>Untag</MenuItem>
                          {
                          this.props.user && !this.props.user.nodataexport &&
                          <MenuItem onClick={this.exportClicked.bind(this, s.id)}>Export</MenuItem>
                          }
                          <MenuItem onClick={this.duplicateClicked.bind(this, s.id)}>Duplicate</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
            </div>
            :
            <div className="text-center space-top-sm">
              <h4>You don&apos;t have any segments!</h4>
              <h5>Segments let you organize contacts using flexible rules.</h5>
            </div>
          }
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Segments,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/segments')).data, s => s.modified).reverse(),
  extra: {
    tags: async() => (await axios.get('/api/recenttags')).data,
  },
});
