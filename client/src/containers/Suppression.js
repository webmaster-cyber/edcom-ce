import React, { Component } from "react";
import { Button, Nav, NavItem, MenuItem, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDCardsContainer, EDCard, EDTabs } from "../components/EDDOM";
import SearchControl from "../components/SearchControl";

import './Suppression.css';

class Suppression extends Component {

  state = {
    searchTerm: '',
    filteredLists: [].concat(this.props.data)
  }

  createClicked = () => {
    this.props.history.push("/suppression/new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/supplists/' + id);
    await this.props.reload();
  }

  switchView = () => {
    this.props.history.push("/exclusion");
  }

  componentDidMount() {
    this._interval = setInterval(() => {
      if (_.find(this.props.data, l => l.processing)) {
        this.props.reload();
      }
    }, 10000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({filteredLists: [].concat(nextProps.data)})
  }

  filterSuppressionLists = (searchTerm) => {
    this.setState({
      searchTerm: searchTerm,
      filteredLists: this.props.data.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
    })
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  render() {
    return (
      <div className="suppression-container">
      <MenuNavbar {...this.props}>
        <TitlePage title="Suppression Lists" button={
          <Button bsStyle="primary" onClick={this.createClicked}>Create Suppression List</Button>
        } tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="1">
              <NavItem eventKey="1" disabled>Suppression Lists</NavItem>
              <NavItem eventKey="2" onClick={this.switchView}>Exclusion Lists</NavItem>
            </Nav>
          </EDTabs>
        }/>
        <LoaderPanel isLoading={this.props.isLoading}>
          {this.props.data.length ?
            <div>
              <div className="pull-right" style={{paddingTop: '8px', paddingBottom: '8px', paddingRight: '49px'}}>
                <SearchControl onChange={this.filterSuppressionLists} value={this.state.searchTerm}/>
              </div>
              <EDCardsContainer>
                {this.state.filteredLists.map(l => (
                  <EDCard key={l.id} header={
                    <div>
                      <span className="pre-title">SUPPRESSION</span>
                      <h3 className="list-name">
                        <Link to={'/suppression/edit?id=' + l.id}>
                          {l.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        {l.processing?
                          <span className="text-warning" style={{height: '140px', paddingTop: '45px'}}>
                            {l.processing}
                          </span>
                          :
                          <div className="circle">
                            <div className="content">
                              <span className="count">{this.num(l.count)}</span>
                              <span className="caption">COUNT</span>
                            </div>
                          </div>
                        }
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={l.id + '-split'}
                          menu="Delete"
                          extra={true}
                          title="Delete Suppression List Confirmation"
                          prompt={"Are you sure you wish to delete '" + l.name + "'?"}
                          onConfirm={this.deleteConfirmClicked.bind(this, l.id)}
                          text="Actions">
                          <MenuItem onClick={() => this.props.history.push('/suppression/edit?id=' + l.id)}>Edit</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
            </div>
            :
            <div className="text-center space-top-sm">
              <h4>No suppression lists yet!</h4>
              <h5>Suppression lists are lists of contacts to suppress for broadcasts and funnels.</h5>
            </div>
          }
        </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: Suppression,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/supplists')).data, l => l.name.toLowerCase())
});
