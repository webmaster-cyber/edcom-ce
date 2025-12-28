import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import { FormGroup, Radio, ControlLabel, FormControl } from "react-bootstrap";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import LoaderIcon from "../components/LoaderIcon";
import { FormControlLabel } from "../components/FormControls";
import getvalue from "../utils/getvalue";
import SaveNavbar from "../components/SaveNavbar";
import parse from "../utils/parse";
import _ from "underscore";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import notify from "../utils/notify";
import JSZip from "jszip";

export default class SuppressionNew extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      type: 'manual',
      data: '',
      file: null,
      isUploading: false,
    }

    this._formRef = null;
  }

  handleChange = event => {
    this.setState({[event.target.id]: getvalue(event)})
  }

  handleSubmit = async event => {
    event.preventDefault();

    var fromzip = null;

    if (this.state.type !== 'manual') {
      if (this.state.file.name.endsWith(".zip")) {
        var zip = await JSZip.loadAsync(this.state.file);
        fromzip = '';
        var files = [];
        zip.forEach(function(path, zipentry) {
          files.push(zipentry.name);
        });
        for (var i = 0; i < files.length; i++) {
          fromzip += await zip.file(files[i]).async("string") + "\r\n";
        }
        if (fromzip.length > 1024 * 1024 * 500) {
          notify.show("This file is too large to process, please contact support for more information", "error");
          return;
        }
      } else if (this.state.file.size > 1024 * 1024 * 500) {
        notify.show("This file is too large to process, please contact support for more information", "error");
        return;
      }
    }

    this.setState({isUploading: true});

    var data;
    if (this.state.type === 'manual') {
      data = new Blob([this.state.data], { type: "text/plain" });
    } else if (fromzip !== null) {
      data = new Blob([fromzip], { type: "text/plain" });
    } else {
      data = this.state.file;
    }

    var upload;
    try {
      upload = (await axios({
        method: 'post',
        url: '/api/uploadfile',
        headers: { "Content-Type": `text/plain` },
        data: data,
      })).data;
    } catch (e) {
      this.setState({isUploading: false});
      throw e;
    }

    var id = (await axios.post('/api/supplists', {
      name: this.state.name,
    })).data.id;

    await axios.post('/api/supplists/' + id + '/import', {
      key: upload.key,
    });

    this.goBack(id);
  }

  goBack = id => {
    var p = parse(this);
    if (p.bcid) {
      if (_.isString(id))
        this.props.history.push("/broadcasts/rcpt?id=" + p.bcid + '&suppid=' + id);
      else
        this.props.history.push("/broadcasts/rcpt?id=" + p.bcid);
    } else if (p.msgid) {
        if (_.isString(id))
          this.props.history.push("/funnels/message/edit?id=" + p.msgid + '&funnelid=' + p.funnelid + '&suppid=' + id);
        else
          this.props.history.push("/funnels/message/edit?id=" + p.msgid + '&funnelid=' + p.funnelid);
    } else {
      this.props.history.push("/suppression");
    }
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="supp-buttons-dropdown"
        text="Upload"
        loadingText="Uploading..."
        className="green"
        disabled={this.props.isSaving}
        onClick={() => {
          sendGA4Event('Suppression', 'Created Suppression File', 'Created Suppression File');
          return this.formSubmit();
        }}
      />
    );
  }

  formRef = r => {
    this._formRef = r;
  }
  formSubmit = () => {
    this._formRef.childNodes[0].click();
  }

  render() {
    return (
      <SaveNavbar title="Create Suppression List" onBack={this.goBack} buttons={this.navbarButtons()} user={this.props.user}
                  isSaving={this.state.isUploading}>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.formRef}>
            <EDFormBox>
              {this.state.isUploading ?
                <div className="text-center">
                  <h3>Uploading contacts, please wait...</h3>
                  <LoaderIcon />
                </div>
               :
                <div>
                  <FormControlLabel
                    id="name"
                    label="Name"
                    obj={this.state}
                    onChange={this.handleChange}
                    required={true}
                  />
                  <FormGroup controlId="type" className="space30">
                    <ControlLabel>How would you like to import suppression data?</ControlLabel>
                    <Radio name="typeGroup" id="type" value="manual" checked={this.state.type==='manual'} onChange={this.handleChange}>Paste in as text</Radio>
                    <Radio name="typeGroup" id="type" value="file" checked={this.state.type==='file'} onChange={this.handleChange}>Upload a file</Radio>
                  </FormGroup>
                  {
                    this.state.type === 'manual' ?
                      <FormControlLabel
                        id="data"
                        space
                        label="Enter suppression data, one email or MD5 per line"
                        obj={this.state}
                        componentClass="textarea"
                        onChange={this.handleChange}
                        rows="8"
                        required={this.state.type === 'manual'}
                      />
                    :
                      <FormGroup controlId="file" className="space30">
                        <ControlLabel>Choose a text file with one email or MD5 per line, or a .zip file with the same contents</ControlLabel>
                        <FormControl id="file" type="file" onChange={this.handleChange} accept=".txt,.csv,.zip,text/*,application/zip" required={this.state.type === 'file'} />
                      </FormGroup>
                  }
                </div>
            }
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </SaveNavbar>
    );
  }
}
