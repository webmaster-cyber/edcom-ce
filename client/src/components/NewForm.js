import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Button, Popover, Overlay } from "react-bootstrap";
import _ from "underscore";
import axios from "axios";
import LoaderIcon from "./LoaderIcon";
import LoaderButton from "./LoaderButton";
import { Lightbox } from "../components/react-modal-image/src";

import "./NewForm.css";

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
                onClick={this.props.onCreate}
                disabled={this.props.isSaving}
              />
            </div>
          </div>
        }
      </div>
    );
  }
}

export default class NewForm extends Component {
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

  handleSubmit = async ev => {
    if (ev)
      ev.preventDefault();

    this.setState({show: true});

    var data = (await axios.get('/api/allformtemplates')).data;
    this.setState({featured: data.featured});
  }

  useTemplate = async tid => {
    this.props.setIsSaving(true);
    try {
      var data = (await axios.get('/api/allformtemplates/' + tid)).data;
      await this.props.finishSubmit(false, '', '', data.parts, data.bodyStyle, data, data.mobile);
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
    }
  }

  useBlank = async () => {
    this.props.setIsSaving(true);
    try {
      await this.props.finishSubmit(true, '', '', [], {version: 3, paddingTop: 20, paddingLeft: 20, paddingRight: 20, paddingBottom: 20});
      this.setState({show: false});
    } finally {
      this.props.setIsSaving(false);
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
        <h3 id="template-title">Choose a Form Template</h3>
        <i className="fa fa-remove remove-button" onClick={this.closeClicked} />
        <div id="newt-sidebar">
          {
            this.state.type === '' ?
              <p className="side-link">Featured Templates <span className="newt-arrow"/></p>
            :
              <p><a href="#f" onClick={() => this.setState({type: ''})}>Featured Templates</a></p>
          }
          <p>
            <a href="#s" onClick={() => this.setState({showBlankPopup:true})} ref={r => this._br = r}>Start From Scratch</a>
            <Overlay show={this.state.showBlankPopup} placement="right" rootClose onHide={() => this.setState({showBlankPopup: false})} target={() => ReactDOM.findDOMNode(this._br)}>
              <Popover id="blank-popover" className="newt-popover" title="Start With a Blank Form?">
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
        </div>
        {
          (this.state.type === '') && 
          <div id="newt-templates" className={this.state.featured?'form':'form center'}>

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
                    <h3 id="empty-header">No Recent Forms Yet!</h3>
                    <p id="empty-msg">After you create a form, its template will appear here for you to select.</p>
                  </div>
                :
                  _.map(this.state.recent, f => <TemplateBox isSaving={this.props.isSaving} onCreate={this.useBroadcast.bind(null, f.id)} key={f.id} f={f} setHideCB={this.setHideCB} />)))
          }
          </div>
        }
      </div>
    );
  }
}
