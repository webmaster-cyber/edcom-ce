import React, { Component } from "react";
import { Button, Modal } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import ConfirmButton from "../components/ConfirmButton";
import TitlePage from "../components/TitlePage";
import LoaderPanel from "../components/LoaderPanel";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection } from "../components/EDDOM";
import { FormControlLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import _ from "underscore";
import copyText from "../utils/clipboard";
import notify from "../utils/notify";

import "./CustomDomains.css";

function copy(text) {
  if (copyText(text)) {
    notify.show("Text copied to clipboard", "success");
  } else {
    notify.show("Error accessing clipboard", "error");
  }
}

function EntryRow({entry}) {
  return (
    <tr>
      <td>{entry.type}</td>
      <td>
        <i className="fa fa-clipboard" onClick={copy.bind(null, entry.name)} style={{fontSize:'20px', color: 'rgb(170, 224, 255)', cursor: 'pointer', marginRight: '8px'}}/>
        {entry.name}
      </td>
      <td>
        <i className="fa fa-clipboard" onClick={copy.bind(null, entry.value)} style={{fontSize:'20px', color: 'rgb(170, 224, 255)', cursor: 'pointer', marginRight: '8px'}}/>
        {entry.value.substring(0, 25) + '...'}
      </td>
    </tr>
  );
}

class CustomDomains extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showAdd: false,
      newDomainName: '',
      saving: false,
      verifying: false,
    };
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  modalChange = event => {
    this.setState({[event.target.id]: event.target.value});
  }

  verifyClicked = async id => {
    this.setState({verifying: id});

    try {
      await axios.post('/api/clientdkim/' + id + '/verify');

      await this.props.reload();
    } finally {
      this.setState({verifying: false});
    }
  }

  addClicked = () => {
    this.setState({showAdd: true});
  }

  addConfirmClicked = async ok => {
    if (!ok) {
      this.setState({showAdd: false});
      return;
    }

    this.setState({showAdd: false, saving: true});

    try {
      await axios.post('/api/clientdkim', {
        name: this.state.newDomainName,
      });

      await this.props.reload();
    } finally {
      this.setState({saving: false});
    }
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/clientdkim/' + id);
    await this.props.reload();
  }

  render() {
    let minWidth = '600px';

    return (
      <MenuNavbar {...this.props} isAdmin={this.props.user && this.props.user.admin && !this.props.loggedInImpersonate}>
        <TitlePage title="Custom Domains" button={
          <LoaderButton
            bsStyle="primary"
            text="Add Custom Domain"
            loadingText="Adding..."
            isLoading={this.state.saving}
            onClick={this.addClicked}
          />
        }/>
        <EDTableSection>
          <Modal show={this.state.showAdd}>
            <Modal.Header>
              <Modal.Title>Add Custom Domain</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <FormControlLabel
                id="newDomainName"
                label="Domain Name"
                obj={this.state}
                onChange={this.modalChange}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.addConfirmClicked.bind(this, true)} bsStyle="primary"
                disabled={!this.state.newDomainName}>
                Add
              </Button>
              <Button onClick={this.addConfirmClicked.bind(this, false)}>Cancel</Button>
            </Modal.Footer>
          </Modal>
          <LoaderPanel isLoading={this.props.isLoading}>
          {
            this.props.data.length ?
              <div style={{minWidth: minWidth}}>
                <div>
                  <h5>In order to mail from a custom domain, you must enter the listed DNS entries into the interface provided by your registrar.</h5>
                  <h5>Here are instructions for editing DNS records at some popular registrars:</h5>
                  <ul>
                    <li><a href="https://www.godaddy.com/help/change-a-txt-record-19233">GoDaddy</a></li>
                    <li><a href="https://www.namecheap.com/support/knowledgebase/article.aspx/317/2237/how-do-i-add-txtspfdkimdmarc-records-for-my-domain">Namecheap</a></li>
                    <li><a href="https://www.name.com/support/articles/115004972547-Adding-a-TXT-Record">Name.com</a></li>
                    <li><a href="https://www1.domain.com/help/article/dns-management-how-to-update-txt-spf-records">Domain.com</a></li>
                    <li><a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-editing.html">Amazon Route 53</a></li>
                  </ul>
                  <h5>Use the <i className="fa fa-clipboard" style={{fontSize:'20px', color: 'rgb(170, 224, 255)', marginLeft: '4px', marginRight: '4px'}}/> button next to each entry to copy it to the clipboard.</h5>
                  <h5>Once the DNS entries for a domain have been configured, press the "Verify" button to verify the settings are correct. After the domain is verified, you can send email from the domain by setting the domain portion of your "From" email address appropriately.</h5>
                </div>
                {
                  _.map(this.props.data, b =>
                    <div className="domain-card" key={b.id}>
                      <h4>
                        {b.name}
                        {
                          b.verified ?
                          <div style={{
                            background: '#e4fcf4',
                            color: '#2dcca1',
                            borderRadius: '4px',
                            height: '36px',
                            lineHeight: '36px',
                            textAlign: 'center',
                            fontSize: '14px',
                            display: 'inline-block',
                            marginLeft: '20px',
                            padding: '0px 10px',
                          }}><img src="/img/active.png" alt=""/> Verified</div>
                          :
                          <div style={{
                            background: '#feeaee',
                            color: '#f13559',
                            borderRadius: '4px',
                            height: '36px',
                            lineHeight: '36px',
                            textAlign: 'center',
                            fontSize: '14px',
                            display: 'inline-block',
                            marginLeft: '20px',
                            padding: '0px 10px',
                          }}><img src="/img/inactive.png" alt=""/> Unverified</div>
                        }
                        <span className="pull-right">
                          {
                            !b.verified &&
                              <LoaderButton
                                text="Verify"
                                loadingText="Verifying..."
                                isLoading={this.state.verifying === b.id}
                                onClick={this.verifyClicked.bind(this, b.id)}
                                style={{marginRight: '10px'}}
                              />
                          }
                          <ConfirmButton
                            id={b.id}
                            extra={true}
                            title="Remove Confirmation"
                            prompt={"Are you sure you wish to remove '" + b.name + "'?"}
                            onConfirm={this.deleteConfirmClicked.bind(this, b.id)}
                            text="Remove">
                          </ConfirmButton>
                        </span>
                      </h4>
                      <h5><strong>Required DNS Entries:</strong></h5>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            b.mgentry &&
                            <EntryRow entry={b.mgentry} />
                          }
                          {
                            b.spfentry &&
                            <EntryRow entry={b.spfentry} />
                          }
                          {
                            b.serverentry &&
                            <EntryRow entry={b.serverentry} />
                          }
                          {
                            b.mx1entry &&
                            <EntryRow entry={b.mx1entry} />
                          }
                          {
                            b.mx2entry &&
                            <EntryRow entry={b.mx2entry} />
                          }
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
              :
              <div className="text-center space-top-sm">
                <h4>No custom domains configured</h4>
              </div>
          }
          </LoaderPanel>
        </EDTableSection>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: CustomDomains,
  initial: [],
  get: async ({id}) => (await axios.get('/api/clientdkim')).data,
});
