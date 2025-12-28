import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import ReactDOM from "react-dom";
import { ControlLabel, FormGroup, FormControl, Button, Popover, Overlay } from "react-bootstrap";
import _ from "underscore";
import axios from "axios";
import getvalue from "../utils/getvalue";
import JSZip from "jszip";
import notify from "../utils/notify";
import LoaderIcon from "./LoaderIcon";
import LoaderButton from "./LoaderButton";
import { Lightbox } from "../components/react-modal-image/src";
import { TextDecoder } from 'text-encoding';
import { defaultBeefreeTemplate } from "../utils/template-utils";

import "./NewTemplate.css";

class TemplateBox extends Component {
  constructor(props) {
    super(props);

    this.state = {
      overlay: false,
      lightbox: false,
    };

    props.setHideCB(this.hideCB);
    this._mounted = false;
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }


  hideCB = ev => {
    if (ev.target.id !== this.props.f.id && this._mounted) {
      this.setState({overlay: false});
    }
  }

  showLightbox = () => {
    this.setState({lightbox: true});
  }
  hideLightbox = () => {
    this.setState({lightbox: false});
  }

  render() {
    var {f} = this.props;

    return (
      <div className="template-box">
        <div className="template-title">{f.name}</div>
        <div className="template-zoom" onClick={this.showLightbox}><i className="fa fa-search"/></div>
        <a href="#t" onClick={() => this.setState({overlay: true})}>
          <div id={f.id} className="template-img" style={{backgroundImage: 'url(' + f.image + ')'}}/>
        </a>
        {
          this.state.lightbox &&
            <Lightbox
              large={f.image}
              alt={f.name}
              onClose={this.hideLightbox}
              hideDownload={true}
            />
        }
        {
          this.state.overlay &&
          <div className="template-box-overlay" onClick={ev => ev.stopPropagation()}>
            <p>Use this Template?</p>
            <div className="template-box-buttons">
              <Button onClick={() => this.setState({overlay: false})} disabled={this.props.isSaving}>No</Button>
              <LoaderButton
                text="Yes"
                loadingText="Wait..."
                bsStyle="primary"
                onClick={() => {
                  sendGA4Event('Composer', 'Template', 'Drag n Drop Composer');
                  return this.props.onCreate();
                }}
                disabled={this.props.isSaving}
              />
            </div>
          </div>
        }
      </div>
    );
  }
}

export default class NewTemplate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      type: '',
      file: null,
      htmlfiles: null,
      selectedFile: null,
      selectedIsHtml: false,
      featured: null,
      recent: null,
      showPopup: false,
      showBlankPopup: false,
    };

    props.setSubmitCB(this.handleSubmit);

    this._hideCBs = [];
  }

  isDisabled = () => {
    return this.state.type === 'import' && (!this.state.file || !(this.state.selectedFile || this.state.selectedIsHtml));
  }

  handleChange = async ev => {
    ev.persist();
    var f = getvalue(ev);
    this.setState({[ev.target.id]: f, htmlfiles: null, selectedFile: null, selectedIsHtml: false}, async () => {
      if (f) {
        if (!ev.target.value.endsWith(".zip")) {
          this.setState({selectedIsHtml: true});
        } else {
          var zip = await JSZip.loadAsync(getvalue(ev));

          var htmlfiles = [];
          zip.forEach(function(path, zipentry) {
            if (zipentry.name.endsWith('.htm') ||
                zipentry.name.endsWith('.html')) {
              htmlfiles.push(zipentry.name);
            }
          });

          if (!htmlfiles.length) {
            notify.show("No HTML file found in Zip", "error");
            return;
          }

          if (htmlfiles.length > 1) { 
            this.setState({htmlfiles: htmlfiles});
          } else {
            this.setState({htmlfiles: htmlfiles, selectedFile: htmlfiles[0]});
          }
        }
      }
    });
  }

  handleSubmit = async (ev, legacy) => {
    if (ev) {
      ev.preventDefault();
    }

    this.setState({show: true, legacy: legacy, type: ''});

    var data = (await axios.get(legacy ? '/api/alltemplates' : '/api/allbeefreetemplates')).data;
    this.setState({featured: data.featured, recent: data.recent});
  }

  useTemplate = async tid => {
    this.props.setIsSaving(true);
    try {
      var data = (await axios.get(this.state.legacy ? '/api/alltemplates/' + tid : '/api/allbeefreetemplates/' + tid)).data;

      if (this.state.legacy) {
        await this.props.finishSubmit(true, '', '', data.parts, data.bodyStyle);
      } else {
        await this.props.finishSubmit(false, 'beefree', data.rawText, [], {});
      }
      
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  useBroadcast = async (bid, templatetype) => {
    this.props.setIsSaving(true);
    try {
      if (this.state.legacy) {
        let data = (await axios.get('/api/broadcasts/' + bid)).data;
        await this.props.finishSubmit(false, '', '', data.parts, data.bodyStyle);
      } else {
        let data;
        if (templatetype === 'broadcast') {
          data = (await axios.get('/api/broadcasts/' + bid)).data;
        } else if (templatetype === 'transactional') {
          data = (await axios.get('/api/transactional/templates/' + bid)).data;
        } else {
          data = (await axios.get('/api/messages/' + bid)).data;
        }

        await this.props.finishSubmit(false, 'beefree', data.rawText, [], {});
      }
      
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  useBlank = async () => {
    sendGA4Event('Composer', 'Blank Drag n Drop', 'Drag n Drop Composer');

    this.props.setIsSaving(true);
    try {
      if (this.state.legacy) {
        await this.props.finishSubmit(true, '', '', [], {version: 3});
      } else {
        const savedRows = (await axios.get('/api/savedrows')).data;

        const footer = savedRows.find(row => row.rowJson.metadata.type === 'sticky-footer');

        let defaultTemplate = defaultBeefreeTemplate();

        if (footer) {
          const res = (await axios.post('/api/beefreemerge', {
            source: defaultTemplate.json,
            replace: [{
                "path": "$..rows[?(@.metadata.type=='sticky-footer')]",
                "value": footer.rowJson
            }]
          })).data;

          if (res.json) {
            defaultTemplate = {
              json: res.json,
              html: res.html
            };
          }
        }

        await this.props.finishSubmit(false, 'beefree', JSON.stringify(defaultTemplate), [], {});
      }
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  useWYSIWYG = async () => {
    sendGA4Event('Composer', 'WYSIWYG', 'WYSIWYG Composer');

    this.props.setIsSaving(true);
    try {
      await this.props.finishSubmit(true, 'wysiwyg', '', [], {});
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  handleImport = async () => {
    sendGA4Event('Composer', 'Imported HTML', 'RAW HTML Composer');

    var campType = 'raw';

    this.props.setIsSaving(true);
    try {
      var htmltext = '';
      var initialize = true;

      if (this.state.selectedIsHtml) {
        var reader = new FileReader();
        reader.onload = _.bind(e => {
          this.props.finishSubmit(false, campType, e.target.result, [], {});
          this.setState({show: false});
        }, this);
        reader.onerror = e => {
          notify.show(e.target.error.toString(), "error");
        }
        reader.readAsText(this.state.file);
        return;
      } else {
        var zip = await JSZip.loadAsync(this.state.file);

        htmltext = await zip.file(this.state.selectedFile).async("uint8array");

        let encoding = 'utf-8';
        if (htmltext.length >= 4 && htmltext[0] === 0xFF && htmltext[1] === 0xFE && htmltext[2] === 0xFF && htmltext[3] === 0xFE) {
          encoding = 'utf-16le';
        }

        htmltext = new TextDecoder(encoding).decode(htmltext);

        var ind = this.state.selectedFile.lastIndexOf('/');
        var basepath = '';
        if (ind >= 0) {
          basepath = this.state.selectedFile.substring(0, ind + 1);
        }

        var imgpaths = [];
        var imgdict = {};
        var imgre = /(<\s*img\s+[^>]*src\s*=\s*")([^"]+)/ig;
        var m = imgre.exec(htmltext);
        while (m !== null) {
          var fullpath = basepath + m[2];
          if (zip.file(fullpath)) {
            imgpaths.push([fullpath, m[2]]);
          }
          m = imgre.exec(htmltext);
        }

        for (var i = 0; i < imgpaths.length; i++) {
          var imgpath = imgpaths[i][0];
          var tagpath = imgpaths[i][1];

          if (imgdict[tagpath]) continue;

          var ext = imgpath.split('.').pop();

          if (!ext)
            continue;

          var upload = (await axios({
            method: 'post',
            url: '/api/uploadfile?type=img&ext=' + ext,
            headers: { "Content-Type": `application/octet-stream` },
            data: await zip.file(imgpath).async("blob")
          })).data;

          imgdict[tagpath] = (await axios.post('/api/imageimport', {
            key: upload.key,
          })).data.url;
        }
        htmltext = htmltext.replace(/(<\s*img\s+[^>]*src\s*=\s*")([^"]+)/ig, (m, p1, p2) => {
          var url = imgdict[p2];
          if (url) {
            return p1 + url;
          } else {
            return m;
          }
        });

        initialize = false;
      }

      await this.props.finishSubmit(initialize, campType, htmltext, [], {});
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  fileClicked = async f => {
    if (!this.props.isSaving) {
      this.setState({selectedFile: f});
    }
  }

  closeClicked = () => {
    if (this.props.isSaving) {
      return;
    }
    this.setState({show: false}, () => {
      this.props.onCancel();
    });
  }

  bodyClicked = ev => {
    this._hideCBs.forEach(cb => cb(ev));
  }

  setHideCB = cb => {
    if (!_.find(this._hideCBs, c => c === cb)) {
      this._hideCBs.push(cb);
    }
  }

  render() {
    if (!this.state.show) {
      return false;
    }

    return (
      <div id="new-template" onClick={this.bodyClicked}>
        <h3 id="template-title">Choose a Template</h3>
        <i className="fa fa-remove remove-button" onClick={this.closeClicked} />
        <div id="newt-sidebar">
          {
            this.state.type === '' ?
              <p className="side-link">{this.state.legacy ? 'Featured Templates' : 'Template Gallery'} <span className="newt-arrow"/></p>
            :
              <p><a href="#f" onClick={() => this.setState({type: ''})}>{this.state.legacy ? 'Featured Templates' : 'Template Gallery'}</a></p>
          }
          {
            (this.state.type === 'recent' ?
              <p className="side-link">{this.state.legacy ? 'Recent Emails' : 'Saved Templates'}<span className="newt-arrow"/></p>
            :
              <p><a href="#f" onClick={() => this.setState({type: 'recent'})}>{this.state.legacy ? 'Recent Emails' : 'Saved Templates'}</a></p>)
          }
          <p>
            <a href="#s" onClick={() => this.setState({showBlankPopup: true})} ref={r => this._br = r}>Start From Scratch</a>
            <Overlay show={this.state.showBlankPopup} placement="right" rootClose onHide={() => this.setState({showBlankPopup: false})} target={() => ReactDOM.findDOMNode(this._br)}>
              <Popover id="blank-popover" className="newt-popover" title="Start With a Blank Template?">
                <Button onClick={() => this.setState({showBlankPopup: false})} disabled={this.props.isSaving}>No</Button>
                <LoaderButton
                  text="Yes"
                  loadingText="Wait..."
                  bsStyle="primary"
                  disabled={this.props.isSaving}
                  onClick={this.useBlank}
                />
              </Popover>
            </Overlay>
          </p>
          {
            this.state.legacy &&
            <div>
              <h5 id="advanced">Advanced</h5>
              <p>
                <a href="#w" onClick={() => this.setState({showPopup: true})} ref={r => this._pr = r}>WYSIWYG</a>
                <Overlay show={this.state.showPopup} placement="right" rootClose onHide={() => this.setState({showPopup: false})} target={() => ReactDOM.findDOMNode(this._pr)}>
                  <Popover id="wysiwyg-popover" className="newt-popover" title="Create a WYSIWYG Template?">
                    <Button onClick={() => this.setState({showPopup: false})} disabled={this.props.isSaving}>No</Button>
                    <LoaderButton
                      text="Yes"
                      loadingText="Wait..."
                      bsStyle="primary"
                      disabled={this.props.isSaving}
                      onClick={this.useWYSIWYG}
                    />
                  </Popover>
                </Overlay>
              </p>
              {
                this.state.type === 'import' ?
                  <p className="side-link">Import HTML <span className="newt-arrow"/></p>
                :
                  <p><a href="#f" onClick={() => this.setState({type: 'import'})}>Import HTML</a></p>
              }
              <div className="mailbakery">
                <a target="_blank" rel="noopener noreferrer" href="https://mailbakery.com/">Gallery sponsored by Mailbakery <i className="fa fa-external-link"/></a>
              </div>
            </div>
        }
        </div>
        {
          (this.state.type === '' || this.state.type === 'recent') && 
          <div id="newt-templates" className={this.state.featured?'':'center'}>

          {
            this.state.type === '' ?
              (!this.state.featured ?
                <LoaderIcon/>
              :
                _.map(this.state.featured, f => <TemplateBox isSaving={this.props.isSaving} onCreate={this.useTemplate.bind(null, f.id)} key={f.id} f={f} setHideCB={this.setHideCB} />))
            :
              (!this.state.recent ?
                <LoaderIcon/>
              :
                (this.state.recent.length === 0 ?
                  <div>
                    <h3 id="empty-header">No {this.state.legacy ? 'Recent Emails' : 'Saved Templates'} Yet!</h3>
                    <p id="empty-msg">After you create a message, its template will appear here for you to select.</p>
                  </div>
                :
                  <div>
                      {
                        this.state.recent.filter(t => t.templatetype === 'broadcast').length > 0 &&
                        <div className="template-section">Broadcasts</div>
                      }
                      {
                        _.map(this.state.recent.filter(t => t.templatetype === 'broadcast'), f => <TemplateBox isSaving={this.props.isSaving} onCreate={this.useBroadcast.bind(null, f.id, f.templatetype)} key={f.id} f={f} setHideCB={this.setHideCB} />)
                      }
                      {
                        this.state.recent.filter(t => t.templatetype === 'message').length > 0 &&
                        <div className="template-section">Funnel Messages</div>
                      }
                      {
                        _.map(this.state.recent.filter(t => t.templatetype === 'message'), f => <TemplateBox isSaving={this.props.isSaving} onCreate={this.useBroadcast.bind(null, f.id, f.templatetype)} key={f.id} f={f} setHideCB={this.setHideCB} />)
                      }
                      {
                        this.state.recent.filter(t => t.templatetype === 'message').length > 0 &&
                        <div className="template-section">Transactional Templates</div>
                      }
                      {
                        _.map(this.state.recent.filter(t => t.templatetype === 'transactional'), f => <TemplateBox isSaving={this.props.isSaving} onCreate={this.useBroadcast.bind(null, f.id, f.templatetype)} key={f.id} f={f} setHideCB={this.setHideCB} />)
                      }
                  </div>
                )
              )
          }
          </div>
        }
        {
          this.state.type === 'import' &&
          <div id="newt-import">
            <FormGroup controlId="file">
              <ControlLabel>Choose an HTML or ZIP File to Import</ControlLabel>
              <FormControl
                id="file"
                type="file"
                onChange={this.handleChange}
                accept=".zip,text/html"
                disabled={this.props.isSaving}
              />
            </FormGroup>
            {
            this.state.htmlfiles && this.state.htmlfiles.length > 1 &&
              <div>
                <ControlLabel>Choose the Index HTML File for the Import:</ControlLabel>
                <div className="list-group">
                  {
                    _.map(this.state.htmlfiles, (f, i) => {
                      return (
                        <a key={i} className={'list-group-item ' + (f === this.state.selectedFile?'active':'')} href={'#f' + i} onClick={this.fileClicked.bind(null, f)}>
                          <div className="reverse">
                            <span>
                              {f}
                            </span>
                          </div>
                        </a>
                      );
                    })
                  }
                </div>
              </div>
            }
            <LoaderButton
              text="Import"
              loadingText="Wait..."
              bsStyle="primary"
              disabled={this.props.isSaving}
              style={{display: this.isDisabled() ? 'none' : undefined}}
              onClick={this.handleImport}
            />
          </div>
        }
      </div>
    );
  }
}
