import React, { Component } from "react";
import { Nav, NavItem, Button, Modal } from "react-bootstrap";
import axios from "axios";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import ReactTable from "react-table";
import SearchControl from "../components/SearchControl";
import moment from "moment";
import _ from "underscore";
import parse from "../utils/parse";

import "./ContactsAllTags.css";

class ContactsAllTags extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var search = '';
    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'tag', desc: false},
    ];

    if (p.tablestate) {
      var ts = JSON.parse(p.tablestate);
      search = ts.search;
      page = ts.page;
      pageSize = ts.pageSize;
      sorted = ts.sorted;
    }

    this.state = {
      search: search,
      page: page,
      pageSize: pageSize,
      sorted: sorted,
      showModal: false,
      removeTag: '',
    };
  }

  switchView = url => {
    this.props.history.push(url);
  }

  filteredData() {
    var s = this.state.search;
    return _.filter(this.props.data, d => {
      if (s && !d.tag.toLowerCase().includes(s.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  searchChanged = s => {
    this.setState({search: s});
  }

  onPageChange = index => {
    this.setState({page: index});
  }
  onPageSizeChange = (size, index) => {
    this.setState({pageSize: size, page: index});
  }
  onSortedChange = sort => {
    this.setState({sorted: sort});
  }

  remove = tag => {
    this.setState({showModal: true, removeTag: tag});
  }

  confirmClicked = async ok => {
    this.setState({showModal: false});

    if (!ok) {
      return;
    }

    await axios.delete('/api/alltags/' + this.state.removeTag);

    this.props.reload();
  }

  render() {
    let columns = [{
      Header: 'Tag',
      headerClassName: 'text-left',
      Cell: ({...props}) => <div className="tag-value">{props.value}</div>,
      accessor: 'tag',
    }, {
      Header: 'Added',
      headerClassName: 'text-right',
      Cell: ({...props}) => moment(props.value).format('l LTS'),
      accessor: 'added',
      className: 'text-right',
      width: 250,
    }, {
      Header: 'Contacts',
      headerClassName: 'text-right',
      Cell: ({...props}) => props.value.toLocaleString(),
      accessor: 'count',
      className: 'text-right',
      width: 100,
    }, {
      Header: 'Remove',
      headerClassName: 'text-center',
      Cell: ({...props}) => {
        return (
          <i className="fa fa-remove remove-icon" onClick={this.remove.bind(null, props.original.tag)} />
        );
      },
      className: 'text-center',
      width: 70,
      mandatory: true,
    }];

    var data = this.filteredData();
    return (
      <div className="contacts">
        <MenuNavbar {...this.props}>
          <TitlePage title="Contact Lists" leftsize={12} rightsize={0} tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/contacts')}>Contact Lists</NavItem>
                <NavItem eventKey="2" disabled>Tags</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, '/contacts/retrieval')}>GDPR Retrieval &amp; Erasure</NavItem>
              </Nav>
            </EDTabs>
          }/>
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDTableSection>
            {
              this.state.showModal &&
                <Modal show={true}>
                  <Modal.Header>
                    <Modal.Title>Remove Tag Confirmation</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <p>Are you sure you wish to untag all contacts with the tag "{this.state.removeTag}" and remove it from your tag list?</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
                    <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
                  </Modal.Footer>
                </Modal>
            }
            {
              this.props.data &&
                <div className="space20 row">
                  <div className="col-xs-6">
                  </div>
                  <div className="col-xs-6 text-right">
                    <SearchControl onChange={this.searchChanged} value={this.state.search} />
                  </div>
                </div>
            }
            {
              this.props.data &&
                (data.length ?
                  <div className="space-top-sm">
                    <ReactTable
                      data={data}
                      columns={columns}
                      minRows={0}
                      sorted={this.state.sorted}
                      page={this.state.page}
                      pageSize={this.state.pageSize}
                      onPageChange={this.onPageChange}
                      onPageSizeChange={this.onPageSizeChange}
                      onSortedChange={this.onSortedChange}
                    />
                  </div>
                  :
                  <div className="text-center space-top-sm">
                    {
                      <h4>No tags created yet! You can add tags to contacts from broadcasts, funnels, or the contact search page.</h4>
                    }
                  </div>)
            }
            </EDTableSection>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: ContactsAllTags,
  initial: [],
  get: async () => (await axios.get('/api/alltags')).data,
});
