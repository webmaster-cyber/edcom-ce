import React, { Component } from "react";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import { FormControlLabel, CheckboxLabel } from "../components/FormControls";
import TemplateEditor from "../components/TemplateEditor";
import { Modal, Button, DropdownButton, MenuItem, ToggleButtonGroup, ToggleButton, FormGroup, Nav, NavItem } from "react-bootstrap";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox, EDTabs } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";
import getvalue from "../utils/getvalue";
import TitlePage from "../components/TitlePage";
import notify from "../utils/notify";
import _ from "underscore";

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

class FormTemplate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeKey: '1',
      designType: 'desktop',
      showCopyModal: false,
    };
  }

  onRadioChange = (prop, val) => {
    if (this.state.designType === 'desktop') {
      this.props.update({[prop]: {$set: val}});
    } else {
      this.props.update({mobile: {[prop]: {$set: val}}});
    }
  }

  onDesignTypeChange = val => {
    this.setState({designType: val});
  }

  handleSubmit = async event => {
    if (!this.props.data.name) {
      event.preventDefault();

      notify.show('Please enter a name', "error");

      return;
    }

    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push('/formtemplates');
  }

  onChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="template-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={this.props.formSubmit.bind(null, true)}
        splitItems={[
          { text: 'Save', onClick: this.props.formSubmit },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  switchView = v => {
    this.setState({activeKey: v});
  }

  onImport = ok => {
    if (!ok) {
      this.setState({showCopyModal: false});
      return;
    }

    this.setState({changed: true, showCopyModal: false}, () => {
      if (this.state.designType === 'desktop') {
        let d = this.props.data.mobile;
        this.props.update({
          parts: {$set:clone(d.parts)},
          bodyStyle: {$set:clone(d.bodyStyle)},
          display: {$set:d.display},
          hellolocation: {$set:d.hellolocation},
          slidelocation: {$set:d.slidelocation},
          modaldismiss: {$set:d.modaldismiss},
          inlinedismiss: {$set:d.inlinedismiss},
        });
      } else  {
        let d = this.props.data;
        this.props.update({
          mobile: {
            parts: {$set:clone(d.parts)},
            bodyStyle: {$set:clone(d.bodyStyle)},
            display: {$set:d.display},
            hellolocation: {$set:d.hellolocation},
            slidelocation: {$set:d.slidelocation},
            inlinedismiss: {$set:d.inlinedismiss},
          },
        });
      }
    });
  }

  render() {
    var ps = this.props.data;
    if (this.state.designType === 'mobile') {
      ps = this.props.data.mobile || {};
    }
    var displayButtons = {
      slide: (<div>
                <span className="name">Slide</span>
                <img src={"/img/forms/slide-" + ps.slidelocation + ".png"} alt="slide" />
              </div>),
      hello: (<div>
                <span className="name">Hello</span>
                <img src={"/img/forms/hello-" + ps.hellolocation + ".png"} alt="hello" />
              </div>),
      modal: (<div>
                <span className="name">Modal</span>
                <img src="/img/forms/modal.png" alt="modal" />
              </div>),
      inline: (<div>
                <span className="name">Inline</span>
                <img src="/img/forms/inline.png" alt="inline" />
              </div>),
    };
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar title="Edit Form Template" user={this.props.user} buttons={this.navbarButtons()}
          isSaving={this.props.isSaving} onBack={this.goBack} id={this.props.id}>
          <TitlePage tabs={
            <EDTabs>
              <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Design</NavItem>
                <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Properties</NavItem>
              </Nav>
            </EDTabs>
          }
          />
          <Modal show={this.state.showCopyModal}>
            <Modal.Header>
              <Modal.Title>
                Copy {this.state.designType === 'desktop'?'Mobile':'Desktop'} Design to {this.state.designType === 'desktop'?'Desktop':'Mobile'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Import all design settings from the {this.state.designType === 'desktop'?'mobile':'desktop'} version of this form?
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.onImport.bind(null, true)} bsStyle="primary">Yes</Button>
              <Button onClick={this.onImport.bind(null, false)}>No</Button>
            </Modal.Footer>
          </Modal>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox style={{display: this.state.activeKey==='2'?'block':'none'}}>
              <div id="displaybox">
                <FormControlLabel
                  id="name"
                  label="Name"
                  obj={this.props.data}
                  onChange={this.onChange}
                />
                <CheckboxLabel
                  id="show"
                  label="Show on Frontend"
                  obj={this.props.data}
                  onChange={this.onChange}
                />
                <FormControlLabel
                  id="order"
                  label="Display Order Number"
                  obj={this.props.data}
                  onChange={this.onChange}
                  type="number"
                  style={{width: '75px'}}
                />
              </div>
            </EDFormBox>
            <div style={{display: this.state.activeKey==='1'?'block':'none', marginTop: '-50px'}}>
              <div className="space10 text-left" style={{height: '56px'}}>
                <span id="designType" style={{verticalAlign: '-8px'}}>
                  <ToggleButtonGroup type="radio" name="designType" value={this.state.designType} onChange={this.onDesignTypeChange}>
                    <ToggleButton value="desktop">
                      <span>Desktop</span>
                    </ToggleButton>
                    <ToggleButton value="mobile">
                      <span>Mobile</span>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </span>
                <span className="typelabel">Type:</span>
                <DropdownButton
                  title={displayButtons[ps.display] || ''}
                  id="displayButton"
                >
                  {
                  _.map(['slide', 'hello', 'modal', 'inline'], d => (
                    <MenuItem key={d} className={ps.display === d?'active':''} onClick={this.onRadioChange.bind(null, 'display', d)}>
                      {displayButtons[d]}
                    </MenuItem>
                  ))
                  }
                </DropdownButton>
                  {
                    (ps.display === 'hello' || ps.display === 'slide') &&
                    <span className="typelabel">Location:</span>
                  }
                  {
                    ps.display === 'hello' &&
                    <DropdownButton
                      id="helloButton"
                      title={
                        <img src={'/img/forms/hello-' + ps.hellolocation + '.png'} alt={ps.hellolocation} />
                      }
                      className="locationButton"
                    >
                      {
                      _.map(['top', 'bottom'], l => (
                        <MenuItem key={l} className={ps.hellolocation === l?'active':''} onClick={this.onRadioChange.bind(null, 'hellolocation', l)}>
                          <img src={'/img/forms/hello-' + l + '.png'} alt={l} />
                        </MenuItem>
                      ))
                      }
                    </DropdownButton>
                  }
                  {
                   ps.display === 'modal' &&
                    <div style={{display: 'inline', verticalAlign: '-6px'}} className="dismiss-check form-inline">
                      <CheckboxLabel
                        id="modaldismiss"
                        obj={ps}
                        label="Dismiss when background clicked"
                        onChange={this.onChange}
                        inline
                        style={{verticalAlign: '20px'}}
                      />
                    </div>
                  }
                  {
                   ps.display === 'inline' &&
                    <div style={{display: 'inline', verticalAlign: '-6px'}} className="dismiss-check form-inline">
                      <CheckboxLabel
                        id="inlinedismiss"
                        obj={ps}
                        label="Removed after submit"
                        onChange={this.onChange}
                        inline
                        style={{verticalAlign: '20px'}}
                      />
                    </div>
                  }
                  {
                    ps.display === 'slide' &&
                    <DropdownButton
                      id="slideButton"
                      title={<img src={'/img/forms/slide-' + ps.slidelocation + '.png'} alt={ps.slidelocation} />}
                      className="locationButton"
                    >
                      {
                      _.map(['bottom-right', 'bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right'], l => (
                        <MenuItem key={l} className={ps.slidelocation === l?'active':''} onClick={this.onRadioChange.bind(null, 'slidelocation', l)}>
                          <img src={'/img/forms/slide-' + l + '.png'} alt={l} />
                        </MenuItem>
                      ))
                      }
                    </DropdownButton>
                  }
                <div className="exchange-button">
                  <DropdownButton id="exchange" title={<i className="fa fa-exchange" />}>
                    <MenuItem onClick={() => this.setState({showCopyModal: true})}>Copy {this.state.designType==='desktop'?'Mobile':'Desktop'} Design</MenuItem>
                  </DropdownButton>
                </div>
              </div>
              <FormGroup>
                <TemplateEditor user={this.props.user} data={this.props.data} update={this.props.update} form={true} sideWidth={31} designType={this.state.designType} />
              </FormGroup>
            </div>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: FormTemplate,
  initial: {
    name: '',
    show: false,
    order: 0,
    parts: [],
    bodyStyle: {version: 3, paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20},
    initialize: false,
    type: '',
    rawText: '',
    display: 'slide',
    modallocation: '',
    inlinelocation: '',
    slidelocation: 'bottom-right',
    hellolocation: 'top',
    mobile: {
      display: 'hello',
      modallocation: '',
      inlinelocation: '',
      slidelocation: 'bottom-right',
      hellolocation: 'bottom',
      parts: [],
      bodyStyle: {version: 3, paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20, bodyType: 'full', bodyWidth: 300},
    }
  },
  get: async ({id}) => (await axios.get('/api/formtemplates/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/formtemplates/' + id, data),
  post: ({data}) => axios.post('/api/formtemplates', data),
});
