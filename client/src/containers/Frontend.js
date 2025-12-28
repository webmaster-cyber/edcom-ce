import React, { Component } from "react";
import axios from "axios";
import { Modal, FormControl, Button, Glyphicon, HelpBlock, Nav, NavItem } from "react-bootstrap";
import { EDFormSection, EDFormBox, EDFormGroup, EDTabs } from "../components/EDDOM";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel, SelectLabel, CheckboxLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import getImage, { getFavicon } from "../utils/get-image";
import getvalue from "../utils/getvalue";
import _ from "underscore";

const defheaders = `From: {{!!from}}
Reply-To: {{!!replyto}}
To: {{!!to}}
Subject: {{!!subject}}
Date: {{!!date}}
MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Message-ID: <{{!!msgid}}>
List-Unsubscribe: <{{!!unsubheaderlink}}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
`;

const cssExample = {
  example:
`body {
  font-family: 'Poppins', sans-serif;
  background-color: #f5f6fa;
}

/* blue top bar */
.navbar, .menu-navbar .navbar-default .navbar-nav.nav-left .dropdown,
#save-sec .navbar-brand,
#save-sec2, #save-sec2 .navbar-brand,
.menu-navbar .navbar-default .navbar-toggle:focus, .menu-navbar .navbar-default .navbar-toggle:hover {
  background-color: #4c84ff;
}

/* nav icons */
.menu-navbar .navbar-default .navbar-nav .nav-icon path {
  fill: rgba(170,224,255,.7);
}

/* nav item text */
.menu-navbar .navbar-default .navbar-nav.nav-left .dropdown > a {
  color: #fff;
}

/* user menu */
#useractions .user-container .user-photo {
  border-color: #fff;
  background-color: #3861bc;
}
#useractions .user-container .user-photo .user-initials,
#useractions .user-container .user-fullname {
  color: #fff;
}
#useractions .user-container .user-companyname {
  color: #ddd;
}

/* green buttons */
.green_btn,
button.green,
button.btn.green,
button.btn.green:active,
button.btn.green:hover,
button.btn.green:focus,
button.btn.green[disabled]:hover,
button.green + button.dropdown-toggle,
button.green + button.dropdown-toggle:active,
button.green + button.dropdown-toggle:hover,
button.green + button.dropdown-toggle:focus,
.open button.green + .dropdown-toggle.btn-default,
.open button.green + .dropdown-toggle.btn-default:active,
.open button.green + .dropdown-toggle.btn-default:focus,
.open button.green + .dropdown-toggle.btn-default:hover,
#msform .action-button {
  background-color: #2dcca1;
  color: #fff;
  border: none;
}
button.btn-primary {
  background-color: #2dcca1;
  color: #fff;
  border: 1px solid #2dcca1;
}
.btn-primary:hover {
  color: #fff;
  background-color: #286090;
  border-color: #204d74;
}

/* blue buttons */
button.btn.blue,
button.btn.blue:active,
button.btn.blue:hover,
button.btn.blue:focus,
button.btn.blue[disabled]:hover,
button.blue + button.dropdown-toggle,
button.blue + button.dropdown-toggle:active,
button.blue + button.dropdown-toggle:hover,
button.blue + button.dropdown-toggle:focus,
.open button.blue + .dropdown-toggle.btn-default,
.open button.blue + .dropdown-toggle.btn-default:active,
.open button.blue + .dropdown-toggle.btn-default:focus,
.open button.blue + .dropdown-toggle.btn-default:hover {
  background-color: #4c84ff;
  color: #fff;
  border: none;
}
button.btn-default, .ReactTable .-pagination .-btn {
  background-color: #ecf2fc;
  color: #4c84ff;
  border: 1px solid #d9dde5;
}

/* white top bars */
#broadcast {
  background-color: #fff;
}
#broadcast h3 {
  color: #1c263f;
}
#save-sec {
  background-color: #fff;
}

/* large tables */
.ed-table table th{
	color: #89909e;
}
.table-row-first, .table-row {
  background: #fff;
  border: 1px solid #eee;
  color: #333;
}

/* cards */
div.ed-card {
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

/* black top bar (broadcast wizard) */
#save-sec2.navbar-black {
  background-color: #3e4c57;
}
#wizard-sec .row.box-shadow, .campaign {
  background: #f5f6fa;
}

/* form bodies */
#msform fieldset .white-box {
  background: #fff;
}
#msform fieldset .white-box.border1 {
  border: 1px solid #e0e4ed;
  box-shadow: 0px 4px 0px 0px #e7eefe;
}
`
};

class Frontend extends Component {
  constructor(props) {
    super(props);

    this.state = { activeKey: '1', showConfirmModal: false };
  }

  switchView = v => {
    this.setState({activeKey: v});
  }

  validateForm() {
    var d = this.props.data;
    if (!d.name.length || d.bouncerate === '' ||
        d.complaintrate === '' || !d.invitename || !d.inviteemail ||
        d.hourlimit === null || d.daylimit === null || d.monthlimit === null || d.trialdays === null)
      return false;
    for (var i = 0; i < d.domainrates.length; i++) {
      var r = d.domainrates[i];

      if (r.bouncerate === '' || r.complaintrate === '')
        return false;
    }
    return true;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleDomainChange = (index, event) => {
    this.props.update({domainrates: {[index]: {[event.target.id]: {$set: getvalue(event)}}}})
  }

  addDomain = event => {
    event.preventDefault();
    this.props.update({domainrates: {$splice: [[0, 0, {
      domain: '',
      bouncerate: 3.0,
      complaintrate: 0.2
    }]]}});
  }

  removeDomain = (index, event) => {
    event.preventDefault();

    this.props.update({domainrates: {$splice: [[index, 1]]}});
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/frontends");
  }

  uploadClick = () => {
    document.getElementById('file').click();
  }

  uploadFaviconClick = () => {
    document.getElementById('fileFavicon').click();
  }

  handleImage = async event => {
    if (event.target.files.length === 0)
      return
    var file = event.target.files[0];

    var props = this.props;

    getImage(file, 300, data => {
      props.update({image: {$set: data}});
    });
  }

  handleFavIcon = async event => {
    if (event.target.files.length === 0)
      return
    var file = event.target.files[0];

    var props = this.props;

    getFavicon(file, data => {
      props.update({favicon: {$set: data}});
    });
  }

  resetClick = () => {
    this.props.update({headers: {$set: defheaders}});
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="frontend-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={this.handleSubmit}
        splitItems={[
          { text: 'Save', onClick: this.onSave },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  copyCSSExample = () => {
    if (this.props.data.customcss && this.props.data.customcss.trim() && this.props.data.customcss.trim() !== cssExample.example.trim()) {
      this.setState({showConfirmModal: true});
    } else {
      this.props.update({customcss: {$set: cssExample.example}});
    }
  }

  confirmClicked = confirm => {
    this.setState({showConfirmModal: false}, () => {
      if (confirm) {
        this.props.update({customcss: {$set: cssExample.example}});
      }
    });
  }

  render() {
    var txnopts = [];
    if (this.props.mailgun && this.props.ses && this.props.sparkpost) {
      txnopts = _.sortBy(this.props.mailgun.concat(this.props.ses).concat(this.props.sparkpost), o => o.name.toLowerCase());
    }

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={this.props.id === 'new'?'Create Frontend':'Edit Frontend'} isSaving={this.props.isSaving}
          onBack={this.goBack} disabled={!this.validateForm()} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDTabs>
              <Nav className="nav-tabs" activeKey={this.state.activeKey}>
                <NavItem eventKey="1" disabled={this.state.activeKey==='1'} onClick={this.switchView.bind(null, '1')}>Profile</NavItem>
                <NavItem eventKey="2" disabled={this.state.activeKey==='2'} onClick={this.switchView.bind(null, '2')}>Custom CSS</NavItem>
                <NavItem eventKey="3" disabled={this.state.activeKey==='3'} onClick={this.switchView.bind(null, '3')}>Broadcast Alert Thresholds</NavItem>
                <NavItem eventKey="4" disabled={this.state.activeKey==='4'} onClick={this.switchView.bind(null, '4')}>Default Send Limits</NavItem>
                <NavItem eventKey="5" disabled={this.state.activeKey==='5'} onClick={this.switchView.bind(null, '5')}>Header Template</NavItem>
                <NavItem eventKey="6" disabled={this.state.activeKey==='6'} onClick={this.switchView.bind(null, '6')}>Password Reset &amp; Signup Emails</NavItem>
              </Nav>
            </EDTabs>
            <EDFormBox space style={{display:this.state.activeKey==='1'?undefined:'none'}}>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <EDFormGroup space>
                <FormControl id="file" type="file" onChange={this.handleImage} accept="image/*" style={{display: 'none'}}/>
                <label>Brand Image</label>
                <div>
                {
                  !this.props.data.image ?
                    <div style={{width:'100px', height: '100px', position: 'relative', border: 'gray solid 1px'}} onClick={this.uploadClick}>
                      <Glyphicon glyph="camera" style={{position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        marginLeft: '-16px',
                                                        marginTop: '-16px',
                                                        cursor: 'pointer',
                                                        fontSize: '32px'}}/>
                    </div>
                    :
                    <img style={{backgroundColor: '#4c84ff', height: '72px', display: 'block', cursor: 'pointer'}} src={this.props.data.image} alt="" onClick={this.uploadClick}></img>
                  }
                  </div>
                <HelpBlock>Click to upload</HelpBlock>
                <HelpBlock>Recommended dimensions: 72 x 72</HelpBlock>
              </EDFormGroup>
              <EDFormGroup space>
                <FormControl id="fileFavicon" type="file" onChange={this.handleFavIcon} accept=".ico" style={{display: 'none'}}/>
                <label>Favicon</label>
                <div>
                {
                  !this.props.data.favicon ?
                    <div style={{width:'100px', height: '100px', position: 'relative', border: 'gray solid 1px'}} onClick={this.uploadFaviconClick}>
                      <Glyphicon glyph="camera" style={{position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        marginLeft: '-16px',
                                                        marginTop: '-16px',
                                                        cursor: 'pointer',
                                                        fontSize: '32px'}}/>
                    </div>
                    :
                    <img style={{backgroundColor: '#fff', height: '32px', display: 'block', cursor: 'pointer'}} src={this.props.data.favicon} alt="" onClick={this.uploadFaviconClick}></img>
                  }
                  </div>
                <HelpBlock>Click to upload</HelpBlock>
                <HelpBlock>Must be an .ico file</HelpBlock>
              </EDFormGroup>
              <CheckboxLabel
                id="useforlogin"
                label="Use for Login Screen"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
            </EDFormBox>
            <EDFormBox space style={{display:this.state.activeKey==='2'?undefined:'none'}}>
              <Modal show={this.state.showConfirmModal}>
                <Modal.Header>
                  <Modal.Title>Confirmation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p>Overwrite current CSS rules with the example rules?</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={this.confirmClicked.bind(null, true)} bsStyle="primary">OK</Button>
                  <Button onClick={this.confirmClicked.bind(null, false)}>Cancel</Button>
                </Modal.Footer>
              </Modal>
              <div style={{display: 'flex', flexDirection: 'row', gap: '12px'}}>
                <div style={{flexGrow: '1'}}>
                  <FormControlLabel
                    id="customcss"
                    label="Custom CSS Rules"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    componentClass="textarea"
                    rows="14"
                    spellCheck={false}
                    style={{fontFamily: 'Courier New, sans serif'}}
                  />
                </div>
                <div style={{flexGrow: '1'}}>
                  <FormControlLabel
                    id="example"
                    label="Example CSS"
                    obj={cssExample}
                    componentClass="textarea"
                    readOnly={true}
                    rows="14"
                    spellCheck={false}
                    style={{fontFamily: 'Courier New, sans serif'}}
                  />
                </div>
              </div>
              <Button onClick={this.copyCSSExample}>
                Copy Example
              </Button>
              <p className="space-top-sm">
                The example CSS rules on the right are set to the platform's default values. They serve to demonstrate some simple
                ways to customize the look of the frontend. <strong>Warning:</strong> making more extensive changes
                to the site's CSS can result in breaking part or all of its functionality (e.g. by hiding important controls).
                Consult a web developer and proceed with caution.
              </p>
            </EDFormBox>
            <div style={{display:this.state.activeKey==='3'?undefined:'none', textAlign: 'left'}} className="space20">
              <h4 style={{margin: '0 auto', width: '90%'}}>Global Settings</h4>
              <EDFormBox space className="form-inline">
                <div>
                  <FormControlLabel
                    id="bouncerate"
                    label="Show Alert on Bounces Higher Than"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    type="number"
                    style={{width:'75px', textAlign: 'right'}}
                    min="0"
                    max="100"
                    step="0.1"
                    inline
                  />{' '}%
                </div>
                <div className="space20">
                  <FormControlLabel
                    id="complaintrate"
                    label="Show Alert on Complaints Higher Than"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    type="number"
                    style={{width:'75px', textAlign: 'right'}}
                    min="0"
                    max="100"
                    step="0.1"
                    inline
                  />{' '}%
                </div>
              </EDFormBox>
              <h4 className="space30" style={{margin: '0 auto', width: '90%'}}>
                Per-Domain Settings
                <div className="pull-right">
                  <Button onClick={this.addDomain} disabled={this.props.data.domainrates.length >= 5}>
                    <Glyphicon glyph="plus" />
                    Add Setting
                  </Button>
                </div>
              </h4>
              {
                _.map(this.props.data.domainrates, (d, i) => (
                  <EDFormBox space className="form-inline" key={i}>
                    <FormControlLabel
                      id="domain"
                      label="Domain:"
                      obj={d}
                      onChange={this.handleDomainChange.bind(null, i)}
                      style={{width: '300px'}}
                      inline
                    />
                    {
                      this.props.data.domainrates.length > 1 &&
                        <div className="pull-right">
                          <Button onClick={this.removeDomain.bind(null, i)}>
                            <Glyphicon glyph="remove" />
                          </Button>
                        </div>
                    }
                    <div className="space20">
                      <FormControlLabel
                        id="bouncerate"
                        label="Show Alert on Bounces Higher Than"
                        obj={d}
                        onChange={this.handleDomainChange.bind(null, i)}
                        type="number"
                        style={{width:'75px', textAlign: 'right'}}
                        min="0"
                        max="100"
                        step="0.1"
                        inline
                      />{' '}%
                    </div>
                    <div className="space20">
                      <FormControlLabel
                        id="complaintrate"
                        label="Show Alert on Complaints Higher Than"
                        obj={d}
                        onChange={this.handleDomainChange.bind(null, i)}
                        type="number"
                        style={{width:'75px', textAlign: 'right'}}
                        min="0"
                        max="100"
                        step="0.1"
                        inline
                      />{' '}%
                    </div>
                  </EDFormBox>
                ))
              }
            </div>
            <div style={{display:this.state.activeKey==='4'?undefined:'none', textAlign: 'left'}} className="space20">
              <EDFormBox space>
                <CheckboxLabel
                  id="useapprove"
                  label="Require Approval Before Activating Accounts"
                  obj={this.props.data}
                  onChange={this.handleChange}
                />
                <CheckboxLabel
                  id="usetrial"
                  label="Time Limit Free Trial"
                  obj={this.props.data}
                  onChange={this.handleChange}
                />
                <FormControlLabel
                  id="trialdays"
                  label="Trial Days"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  type="number"
                  min="1"
                  style={{width: '90px'}}
                  disabled={!this.props.data.usetrial}
                />
                <FormControlLabel
                  id="minlimit"
                  label="Send Limit Per Minute for New Customers"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  type="number"
                  min="0"
                  style={{width: '90px'}}
                />
                <FormControlLabel
                  id="hourlimit"
                  label="Hourly Send Limit for New Customers"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  type="number"
                  min="0"
                  style={{width: '90px'}}
                />
                <FormControlLabel
                  id="daylimit"
                  label="Daily Send Limit for New Customers"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  type="number"
                  min="0"
                  style={{width: '90px'}}
                />
                <FormControlLabel
                  id="monthlimit"
                  label="Monthly Send Limit for New Customers"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  type="number"
                  min="0"
                  style={{width: '90px'}}
                />
                <div className="space20 form-inline">
                  <FormControlLabel
                    id="bouncethreshold"
                    label="Pause Sending if Bounces Higher Than"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    type="number"
                    style={{width:'75px', textAlign: 'right'}}
                    min="0"
                    max="100"
                    step="0.1"
                    inline
                  />{' '}%
                </div>
                <div className="space20 form-inline">
                  <FormControlLabel
                    id="unsubthreshold"
                    label="Pause Sending if Unsubscribes Higher Than"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    type="number"
                    style={{width:'75px', textAlign: 'right'}}
                    min="0"
                    max="100"
                    step="0.1"
                    inline
                  />{' '}%
                </div>
                <div className="space20 form-inline">
                  <FormControlLabel
                    id="complaintthreshold"
                    label="Pause Sending if Complaints Higher Than"
                    obj={this.props.data}
                    onChange={this.handleChange}
                    type="number"
                    style={{width:'75px', textAlign: 'right'}}
                    min="0"
                    max="100"
                    step="0.1"
                    inline
                  />{' '}%
                </div>
              </EDFormBox>
            </div>
            <EDFormBox space style={{display:this.state.activeKey==='5'?undefined:'none'}}>
              <FormControlLabel
                id="headers"
                label="Headers"
                obj={this.props.data}
                onChange={this.handleChange}
                componentClass="textarea"
                rows="12"
                spellCheck={false}
                style={{fontFamily:'Courier New, sans serif'}}
              />
              <div className="pull-right">
                <Button onClick={this.resetClick}>
                  Reset To Default
                </Button>
              </div>
              <SelectLabel
                id="fromencoding"
                label="From Name Encoding"
                obj={this.props.data}
                onChange={this.handleChange}
                help="When &quot;Default&quot; is selected, headers will be encoded with quoted-printable if they contain non-ascii characters"
                space
              >
                <option value="none">Default</option>
                <option value="b64">Base 64</option>
                <option value="qp">Quoted-Printable</option>
              </SelectLabel>
              <SelectLabel
                id="subjectencoding"
                label="Subject Encoding"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              >
                <option value="none">Default</option>
                <option value="b64">Base 64</option>
                <option value="qp">Quoted-Printable</option>
              </SelectLabel>
              <h5 className="text-center space30">These settings are only for mail sent via Velocity MTA, not for SMTP Relay or API accounts</h5>
            </EDFormBox>
            <EDFormBox space style={{display:this.state.activeKey==='6'?undefined:'none'}}>
              <FormControlLabel
                id="invitename"
                label="From Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <FormControlLabel
                id="inviteemail"
                label="From Email Address"
                obj={this.props.data}
                onChange={this.handleChange}
                type="email"
                space
              />
              <SelectLabel
                id="txnaccount"
                label="API Connection"
                obj={this.props.data}
                onChange={this.handleChange}
                options={txnopts}
                emptyVal="Choose an API Connection"
                space
              />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: Frontend,
  initial: {
    name: '',
    welcometext: 'Welcome',
    bodydomain: '',
    customcss: '',
    usedkim: true,
    bouncerate: 3.0,
    complaintrate: 0.2,
    domainrates: [{
      domain: '',
      bouncerate: 3.0,
      complaintrate: 0.2
    }],
    bouncethreshold: 99,
    unsubthreshold: 99,
    complaintthreshold: 99,
    fromencoding: 'none',
    subjectencoding: 'none',
    headers: defheaders,
    invitename: 'Welcome',
    inviteemail: 'invite@domain.com',
    useapprove: false,
    usetrial: false,
    trialdays: 10,
    minlimit: 999999999,
    hourlimit: 999999999,
    daylimit: 999999999,
    txnaccount: '',
  },
  get: async ({id}) => (await axios.get('/api/frontends/' + id)).data,
  post: ({data}) => axios.post('/api/frontends', data),
  patch: ({id, data}) => axios.patch('/api/frontends/' + id, data),
  extra: {
    mailgun: async () => (await axios.get('/api/mailgun')).data,
    ses: async () => (await axios.get('/api/ses')).data,
    sparkpost: async () => (await axios.get('/api/sparkpost')).data,
  },
});
