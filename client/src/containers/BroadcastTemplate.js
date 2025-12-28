import React, { Component } from "react";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import axios from "axios";
import TemplateEditor from "../components/TemplateEditor";
import TemplateRawEditor from "../components/TemplateRawEditor";
import TemplateWYSIWYGEditor from "../components/TemplateWYSIWYGEditor";
import BroadcastNavbar from "../components/BroadcastNavbar";
import notify from "../utils/notify";
import { EDFormSection } from "../components/EDDOM";
import ScrollToTop from "../components/ScrollToTop";
import TestLog from "../components/TestLog";
import Preheader from "../components/Preheader";
import Beforeunload from "react-beforeunload"
import { Prompt } from "react-router-dom";
import TestButton from "../components/TestButton";
import TemplateBeefreeEditor from "../components/TemplateBeefreeEditor";

import "./BroadcastTemplate.css";

class BroadcastTemplate extends Component {

  constructor(props) {
    super(props);

    this.state = {
      showTestEmailModal: false,
      changed: false,
    };

    this._saveCB = null;
  }

  toggleTestEmailModal = (show) => {
    this.setState({showTestEmailModal: typeof show === 'boolean' ? show : !this.state.showTestEmailModal})
  }

  save = async () => {
    if (this._saveCB) {
      await  this._saveCB();
    }
    
    return this.props.save();
  }

  handleSubmit = async event => {
    var ro = !!this.props.data.sent_at;

    event.preventDefault();

    if (!ro) {
      await this.save();

      await this.props.reloadUser();
    }

    this.setState({changed: false}, () => {
      this.props.history.push('/broadcasts/rcpt?id=' + this.props.id);
    });
  }

  onLinkClick = async url => {
    await this.save();

    await this.props.reloadUser();

    this.setState({changed: false}, () => {
      this.props.history.push(url);
    });
  }

  onExit = () => {
    this.setState({changed: false}, () => {
      this.props.history.push('/broadcasts');
    });
  }

  saveAndExit = async () => {
    var ro = !!this.props.data.sent_at;
    if (!ro) {
      await this.save();

      await this.props.reloadUser();
    }

    this.onExit();
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: event.target.value}});
  }

  updateEmails = emails => {
    axios.patch('/api/testemails', emails);
  }

  sendTest = async (to, route) => {
    await this.save();

    await axios.post('/api/broadcasts/' + this.props.id + '/test', {
      to: to,
      route: route,
    });

    await this.props.reloadUser();

    this.props.reloadExtra();

    notify.show('Test email submitted', "success", 5000);
  }

  testLog = () => {
    this.setState({showTestLog: true});
  }

  testLogClosed = () => {
    this.setState({showTestLog: false});
  }

  wizardNavbarButtons = () => {
    var ro = !!this.props.data.sent_at;

    return (
      <span>
        <LoaderButton
          id="send-buttons-dropdown"
          text="Send Test Email"
          loadingText="Saving..."
          disabled={ro || this.props.isSaving}
          onClick={this.toggleTestEmailModal}
          splitItems={[
            { text: 'Test Log', onClick: this.testLog },
          ]}
        />
        <LoaderButton
          id="next-buttons-dropdown"
          text="Choose Recipients"
          loadingText="Saving..."
          className="green"
          disabled={ro || this.props.isSaving}
          onClick={this.handleSubmit}
          splitItems={[
            { text: 'Save and Exit', onClick: this.saveAndExit },
            { text: 'Exit', onClick: this.onExit },
          ]}
        />
      </span>
    )
  }

  update = (u, cb) => {
    this.setState({changed: true});
    this.props.update(u, cb);
  }

  render() {
    var ro = !!this.props.data.sent_at;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        {
          this.state.changed &&
            <Beforeunload onBeforeunload={() => "Are you sure you want to exit without saving?"} />
        }
        <Prompt when={this.state.changed} message="Are you sure you want to exit without saving?" />
        <BroadcastNavbar
          black
          fixed
          isSaving={this.props.isSaving} disabled={this.props.isSaving}
          backText="Edit Settings"
          link={'/broadcasts/settings?id=' + this.props.id}
          onLinkClick={this.onLinkClick}
          preheader={
            this.props.data.type !== 'raw' ?
              <Preheader obj={this.props.data} onChange={this.handleChange} black />
            :
              undefined
          }
          buttons={this.wizardNavbarButtons()} user={this.props.user} />
        <EDFormSection onSubmit={this.handleSubmit} nospace noShadow>
          <TestLog show={this.state.showTestLog} onClose={this.testLogClosed} />
	  <span style={{display: 'none'}}>
	    <TestButton
	      emails={this.props.testemails}
	      onConfirm={this.sendTest}
	      onUpdate={this.updateEmails}
	      disabled={ro || this.props.isSaving}
	      routes={this.props.routes}
	      toggleModal={this.toggleTestEmailModal}
	      showModal={this.state.showTestEmailModal}
	      lasttest={this.props.lasttest}
	    />
	  </span>
          {
            this.props.data.type &&
              <div style={{height: '52px'}}/>
          }
          {
            !this.props.data.type?
              <TemplateEditor fixed user={this.props.user} data={this.props.data} update={this.update} readOnly={ro} fields={this.props.allfields} />
            :
              this.props.data.type === 'beefree' ?
                <TemplateBeefreeEditor data={this.props.data} update={this.update}
                  onChange={() => this.setState({changed: true})}
                  setSaveCB={cb => this._saveCB = cb}
                  fullScreen={true}
                  readOnly={ro} fields={this.props.allfields} loggedInImpersonate={this.props.loggedInImpersonate}
                  user={this.props.user} nospace />
                :
                this.props.data.type === 'raw' ?
                  <TemplateRawEditor data={this.props.data} update={this.update} readOnly={ro} fields={this.props.allfields} />
                :
                  <TemplateWYSIWYGEditor data={this.props.data} update={this.update} readOnly={ro} fields={this.props.allfields} loggedInUID={this.props.loggedInUID} loggedInCookie={this.props.loggedInCookie} loggedInImpersonate={this.props.loggedInImpersonate} nospace />
          }
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: BroadcastTemplate,
  initial: [],
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/broadcasts/' + id, data),
  extra: {
    testemails: async () => (await axios.get('/api/testemails')).data,
    routes: async () => (await axios.get('/api/userroutes')).data,
    lasttest: async () => (await axios.get('/api/lasttest')).data,
    allfields: async() => (await axios.get('/api/allfields')).data,
  }
});
