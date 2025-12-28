import React, { Component } from "react";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDTableSection } from "../components/EDDOM";
import ReactTable from "react-table";
import { Checkbox, Button, Modal, Row, Col } from "react-bootstrap";
import update from "immutability-helper";
import getvalue from "../utils/getvalue";
import _ from "underscore";
import notify from "../utils/notify";

class ContactsDomains extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectAll: false,
      selected: {},
      isSaving: false,
      showModal: false,
    };
  }

  isSelected = s => {
    return this.state.selected[s.domain] || false;
  }

  goBack = () => {
    this.props.history.push('/contacts');
  }

  onHeaderCheckClick = e => {
    e.stopPropagation();
  }

  onHeaderCheckChange = e => {
    var val = getvalue(e);
    var p = {selectAll: val, selected: {}};
    if (val) {
      _.each(this.props.stats, s => {
        p.selected[s.domain] = true;
      });
    }
    this.setState(p);
  }

  onCheckChange = e => {
    var val = getvalue(e);
    var p = {};
    if (this.state.selectAll) {
      p.selectAll = false;
      val = false;
    }
    p.selected = update(this.state.selected, {[e.target.id]: {$set: val}});
    this.setState(p);
  }

  menuDisabled = () => {
    return !_.find(_.values(this.state.selected), s => s);
  }

  selectCount = () => {
    var cnt = 0;
    _.map(this.props.stats, s => {
      if (this.isSelected(s))
        cnt++;
    });
    return cnt;
  }

  confirmClicked = async ok => {
    this.setState({showModal: false});

    if (ok) {
      await axios.post('/api/lists/' + this.props.id + '/deletedomains', _.filter(_.map(this.props.stats, s => {
        if (this.isSelected(s))
          return s.domain;
        return null;
      }), s => s));

      notify.show("Delete request submitted", "success");

      this.setState({selected: {}, selectAll: false});
    }
  }

  deleteClicked = () => {
    if (this.menuDisabled()) {
      notify.show("Please select one or more domains", "error");
      return;
    }
    this.setState({showModal: true});
  }

  render() {
    let columns = [{
      Header: <Checkbox className="nomargin" checked={this.state.selectAll} disabled={this.state.isSaving}
                        onClick={this.onHeaderCheckClick} onChange={this.onHeaderCheckChange} />,
      accessor: '',
      Cell: ({...props}) => {
        return <Checkbox className="nomargin" id={props.original.domain} checked={this.isSelected(props.original)}
                         disabled={this.state.isSaving} onChange={this.onCheckChange} />;
      },
      width: 35,
      mandatory: true,
    }, {
      Header: 'Domain',
      accessor: 'domain',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
    }, {
      Header: 'Count',
      accessor: 'count',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toLocaleString()}</span>,
      className: 'text-right',
    }];

    let dataName = this.props.data && (this.props.data.name || '')

    return (
      <div>
        <SaveNavbar title={`Contact List Domains ${dataName ? `for "${dataName}"` : ''}`} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDTableSection>
            {
              this.props.stats &&
                (this.props.stats.length ?
                  <Row>
                    <Col sm={8} smOffset={2}>
                      <div className="space20">
                        <div className="queue-dropdown">
                          <Button disabled={this.state.isSaving} onClick={this.deleteClicked}>
                            Delete Domains
                          </Button>
                          {
                            this.state.showModal &&
                              <Modal show={true}>
                                <Modal.Header>
                                  <Modal.Title>Delete Confirmation</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                  <p>Are you sure you wish to delete all contacts from {this.selectCount() > 1?'these domains':'this domain'}?</p>
                                </Modal.Body>
                                <Modal.Footer>
                                  <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
                                  <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
                                </Modal.Footer>
                              </Modal>
                          }
                        </div>
                      </div>
                      <ReactTable
                        data={this.props.stats}
                        columns={columns}
                        minRows={0}
                        defaultSorted={[
                          {id: 'count', desc: true},
                        ]}
                      />
                    </Col>
                  </Row>
                  :
                  <div className="text-center space-top-sm">
                    <h4>No contact domain data found!</h4>
                  </div>)
            }
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: ContactsDomains,
  get: async ({id}) => (await axios.get('/api/lists/' + id)).data,
  extra: {
    stats: async ({id}) => (await axios.get('/api/lists/' + id + '/domainstats')).data,
  }
});
