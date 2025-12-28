import React, { Component } from "react";
import { Button, Nav, NavItem, Row, Col, MenuItem } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTabs, EDCardsContainer, EDCard } from "../components/EDDOM";
import { Lightbox } from "../components/react-modal-image/src";

class BeefreeTemplates extends Component {
  constructor(props) {
    super(props);

    this.state = {
      lightbox: null,
    };
  }

  showLightbox = id => {
    this.setState({lightbox: id});
  }
  hideLightbox = id => {
    this.setState({lightbox: null});
  }

  componentDidMount() {
    this._interval = setInterval(() => {
      if (_.find(this.props.data, l => !l.image)) {
        this.props.reload();
      }
    }, 3000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  createClicked = () => {
    this.props.history.push("/beefreetemplates/edit?id=new");
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/beefreetemplates/' + id);
    await this.props.reload();
  }

  duplicateClicked = async id => {
    await axios.post('/api/beefreetemplates/' + id + '/duplicate');
    await this.props.reload();
  }

  switchView = url => {
    this.props.history.push(url);
  }

  render() {
    return (
      <div className="servers">
        <MenuNavbar {...this.props} isAdmin={true}>
          <TitlePage title="Template Gallery" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Add Template</Button>
          } tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="2">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, "/frontends")}>Frontends</NavItem>
                <NavItem eventKey="2" disabled>Template Gallery</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, "/gallerytemplates")}>Template Gallery (Legacy)</NavItem>
                <NavItem eventKey="4" onClick={this.switchView.bind(null, "/formtemplates")}>Form Templates</NavItem>
              </Nav>
            </EDTabs>
          } />
          <LoaderPanel isLoading={this.props.isLoading}>
            {this.props.data.length ?
              <EDCardsContainer>
                {this.props.data.map(s => (
                  <EDCard key={s.id} header={
                    <div>
                      <span className="pre-title">{
                        s.show ? 'LIVE' : 'DRAFT'
                      }</span>
                      <h3 className="server-name">
                        <Link to={'/beefreetemplates/edit?id=' + s.id}>
                          {s.name}
                        </Link>
                      </h3>
                    </div>
                  }>
                    <Row>
                      <Col xs={12} className="text-center">
                        {
                          !s.image ?
                           'Generating Image...'
                          :
                            <a href="#lb" onClick={this.showLightbox.bind(null, s.id)}>
                              <div alt="gallery" style={{display: 'inline-block', backgroundColor: '#fff', backgroundRepeat: 'no-repeat', backgroundSize: '200px auto', backgroundImage: 'url(' + s.image + ')', width: '200px', height: '266px'}}/>
                            </a>
                        }
                        {
                          this.state.lightbox === s.id &&
                          <Lightbox
                            large={s.image}
                            alt={s.name}
                            onClose={this.hideLightbox}
                            hideDownload={true}
                          />
                        }
                      </Col>
                      <Col xs={12} className="text-center space25">
                        <ConfirmDropdown
                          id={s.id + '-split'}
                          menu="Delete"
                          title="Delete Confirmation"
                          prompt={"Are you sure you wish to delete '" + s.name + "'?"}
                          onConfirm={this.deleteConfirmClicked.bind(this, s.id)}
                          extra={true}
                          text="Actions">
                          <MenuItem onClick={() => this.props.history.push('/beefreetemplates/edit?id=' + s.id)}>Edit</MenuItem>
                          <MenuItem onClick={this.duplicateClicked.bind(this, s.id)}>Duplicate</MenuItem>
                        </ConfirmDropdown>
                      </Col>
                    </Row>
                  </EDCard>
                ))}
              </EDCardsContainer>
              :
              <div className="text-center space-top-sm">
                <h4>No templates configured.</h4>
                <h5>Templates appear as selections when users create a new message.</h5>
              </div>
            }
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: BeefreeTemplates,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/beefreetemplates')).data, s => s.name.toLowerCase())
});
