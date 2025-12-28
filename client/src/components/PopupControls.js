import React, { Component } from "react";
import ReactDOM from 'react-dom';
import { OverlayTrigger, Modal, Button, ButtonGroup, Overlay, Popover, FormGroup, ControlLabel, FormControl } from "react-bootstrap";
import { SketchPicker, SwatchesPicker } from "react-color";
import { SelectLabel, FormControlLabel } from "./FormControls";
import { getLinkType } from "../utils/template-utils";
import _ from "underscore";
import getvalue from "../utils/getvalue";

import "./PopupControls.css";

export class ColorControl extends Component {
  colorChange = event => {
    this.props.onChangeComplete({hex: '#' + event.target.value});
  }

  onClick = () => {
    if (this.props.onClick) {
      this.props.onClick();
    }
  }

  render() {
    var p = this.props;
    var color = p.color;
    if (color.startsWith('#')) {
      color = color.substring(1);
    }
    var trigger = <div style={{width:'34px', height:'34px', backgroundColor: p.color, display: 'inline-block', border: '1px solid #ccc'}}></div>;
    return (
      <div className="form-inline" style={{position: 'relative', display: this.props.inline?'inline-block':'block'}} onClick={this.onClick}>
        { p.disabled ?
          trigger
          :
          <OverlayTrigger rootClose trigger="click" placement="bottom" overlay={
              <Popover id={'margin-popover'} style={{zIndex:this.props.higher?1100:1001}}>
                <ColorPicker {...p} />
              </Popover>
          }>
            {trigger}
          </OverlayTrigger>
        }
        <input disabled={p.disabled} className="form-control" value={color} style={{paddingLeft: '16px', marginLeft: '4px', width: '92px', verticalAlign: 'top'}} onChange={this.colorChange} />
        <span style={{position: 'absolute', left:'45px', top:'7px'}}>#</span>
      </div>
    );
  }
}


export class LinkPopup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
      url: '',
      color: '',
      underline: false,
      type: '',
    };
  }

  onClicked = () => {
    var {url,color,underline} = this.props.onPopup();
    if (url !== null) {
      var {link, type} = getLinkType(url);
      this.setState({url: link, type: type, color: color, underline: underline, showModal: true});
    }
  }

  confirmClicked = yes => {
    this.setState({showModal: false});

    if (yes) {
      var ret = this.state.url;
      if (this.state.type === 'unsub')
        ret = '{{!!unsublink}}';
      else if (this.state.type === 'unsublink')
        ret = '{{!!unsublink|' + ret + '}}';
      else if (this.state.type === 'notrack')
        ret = '{{!!notrack|' + ret + '}}';
      this.props.onConfirm(ret, this.state.color, this.state.underline);
    }
  }

  handleChange = event => {
    this.setState({[event.target.id]: getvalue(event)});
  }

  handleColorChange = color => {
    this.setState({color: color.hex});
  }

  onKeyDown = event => {
    if (event.which === 13) {
      this.confirmClicked(true);
    }
  }

  render() {
    const {disabled, nocolor} = this.props;

    return (
      <Button onClick={this.onClicked} disabled={disabled}>
        <i className="fa fa-link"/>
        <Modal show={this.state.showModal}>
          <Modal.Header style={{paddingTop: '8px', paddingBottom: nocolor?'8px':0}}>
            <Modal.Title style={{display: 'inline-block', marginTop: '4px'}}>Add Link</Modal.Title>
            { !nocolor &&
            <div style={{display: 'inline-block', float: 'right'}}>
              <ControlLabel style={{verticalAlign: 'top', marginTop: '8px'}}>Color:</ControlLabel>
              {' '}
              <ColorControl color={this.state.color} disableAlpha={true} onChangeComplete={this.handleColorChange} higher inline />
              <div className="checkbox" style={{display: 'inline-block', verticalAlign: 'top', marginLeft: '12px', marginTop: '8px'}}>
                <label>
                  <input id="underline" type="checkbox" checked={this.state.underline} onChange={this.handleChange} /> Underline
                </label>
              </div>
            </div>
            }
          </Modal.Header>
          <Modal.Body>
            <SelectLabel
              id="type"
              obj={this.state}
              label="Link Type"
              onChange={this.handleChange}
            >
              <option value="">Normal</option>
              <option value="unsub">Unsubscribe Page</option>
              <option value="unsublink">Unsubscribe and Redirect</option>
              <option value="notrack">Third-Party Unsubscribe</option>
            </SelectLabel>
            <FormControlLabel
              id="url"
              space
              obj={this.state}
              label="URL"
              type="url"
              onChange={this.handleChange}
              onKeyDown={this.onKeyDown}
              disabled={this.state.type === 'unsub'}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button disabled={this.state.type !== 'unsub' && !this.state.url} onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">OK</Button>
            <Button onClick={this.confirmClicked.bind(this, false)}>Cancel</Button>
          </Modal.Footer>
        </Modal>
      </Button>
    );
  }
}

export class ConfirmPopup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
      value: '',
    };
  }

  onClicked = () => {
    var val = this.props.onPopup();
    if (val !== null)
      this.setState({value: val, showModal: true});
  }

  confirmClicked = yes => {
    this.setState({showModal: false});

    if (yes) {
      this.props.onConfirm(this.state.value);
    }
  }

  handleChange = event => {
    this.setState({value: event.target.value});
  }

  onKeyDown = event => {
    if (event.which === 13) {
      this.confirmClicked(true);
    }
  }

  render() {
    const {text, title, label, type, disabled} = this.props;

    return (
      <Button onClick={this.onClicked} disabled={disabled}>
        {text}
        <Modal show={this.state.showModal}>
          <Modal.Header>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormControlLabel
              id="value"
              obj={this.state}
              label={label}
              type={type}
              onChange={this.handleChange}
              onKeyDown={this.onKeyDown}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">OK</Button>
            <Button onClick={this.confirmClicked.bind(this, false)}>Cancel</Button>
          </Modal.Footer>
        </Modal>
      </Button>
    );
  }
}

export class ColorPicker extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      view: 'swatch',
      colorInput: props.color.substring(1),
    };
  }

  componentWillReceiveProps(props) {
    this.setState({colorInput: props.color.substring(1)});
  }

  inputChange = event => {
    var color = event.target.value.trim().toUpperCase();

    this.setState({colorInput: color}, () => {
      if (/^[0-9A-F]{6}$/.test(color)) {
        this.props.onChangeComplete({hex: '#'+color});
      }
    });
  }

  onChange = color => {
    this.setState({colorInput: color.hex.toUpperCase().substring(1)}, () => {
      this.props.onChangeComplete(color);
    });
  }

  render() {
    var {color} = this.props;

    return (
      <div>
        <ButtonGroup className="color-buttons">
          <Button active={this.state.view === 'swatch'} onClick={() => {this.setState({view:'swatch'})}}>Swatches</Button>
          <Button active={this.state.view === 'picker'} onClick={() => {this.setState({view:'picker'})}}>Picker</Button>
        </ButtonGroup>
        {
          this.state.view === 'swatch' ?
            <div>
              <SwatchesPicker
                color={color}
                width={244}
                height={213}
                onChange={this.onChange}
                colors={[
                  ['#FFFFFF', '#003748', '#004E63', '#006E8C', '#008DB1', '#00A4D3', '#00C8F8', '#4DD7FA', '#91E4FB', '#C9F1FD'],
                  ['#f7f6f6', '#021F54', '#033076', '#0844A4', '#0C59CF', '#1464F6', '#3D8AF7', '#75A9F9', '#A8C6FA', '#D4E3FC'],
                  ['#EBEBEB', '#120639', '#1C0C4F', '#2E1572', '#3B1D8F', '#5125AD', '#6334E3', '#8B51F5', '#B38DF7', '#DACAFB'],
                  ['#D6D6D6', '#2F073B', '#460E56', '#631878', '#7E2199', '#9C29B7', '#C238EB', '#D757F6', '#E692F8', '#F2C9FB'],
                  ['#C0C0C0', '#3D051B', '#570E28', '#7A163C', '#9C1F4D', '#BB285C', '#E93578', '#F06E9C', '#F6A2BF', '#FAD2E0'],
                  ['#AAAAAA', '#5E0202', '#840705', '#B70F0A', '#E61610', '#FF3823', '#FF5D55', '#FF8A84', '#FFB4B0', '#FFDAD8'],
                  ['#929292', '#5B1A04', '#7D2709', '#AF3A11', '#DC4C18', '#FF6624', '#FF8351', '#FFA382', '#FFC3AE', '#FFE2D8'],
                  ['#7A7A7A', '#58330A', '#7B4812', '#AA671D', '#D68227', '#FFA834', '#FFB253', '#FFC581', '#FFD8AD', '#FFECD7'],
                  ['#606060', '#553D0D', '#785616', '#A77A23', '#D39C2F', '#FEC63D', '#FFC957', '#FFD783', '#FFE3AE', '#FFF1D7'],
                  ['#333333', '#656119', '#8C8525', '#C3BB38', '#F4EB49', '#FEFB64', '#FEF67F', '#FEF8A0', '#FEFAC0', '#FEFCE0'],
                  ['#232323', '#4E5516', '#6E7623', '#99A534', '#C1D045', '#D7EB5A', '#E2EE79', '#E9F29B', '#F1F6BE', '#F7FADE'],
                  ['#000000', '#243E16', '#355723', '#4C7A34', '#629C44', '#72BB53', '#92D36E', '#AEDD94', '#CBE8BA', '#DFEDD6'],
                ]}
              />
              <input className="color-input" value={this.state.colorInput} onChange={this.inputChange} />
              <div style={{
                display: 'inline-block',
                borderRadius: '2px',
                boxShadow: 'rgba(0, 0, 0, 0.15) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.25) 0px 0px 4px inset',
                background: color,
                width: '24px',
                height: '19px',
                marginTop: '11px',
                marginLeft: '12px',
                marginRight: '2px',
              }}/>
            </div>
          :
            <SketchPicker
              width={225}
              color={color}
              disableAlpha={true}
              onChange={this.onChange}/>
        }
        {
          this.props.enableTransparent &&
          <div className="checkbox">
            <label>
              <input type="checkbox" checked={this.props.transparent} onChange={this.props.onTransparentChange} /> Transparent
            </label>
          </div>
        }
      </div>
    );
  }

}

export class ColorPopup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
    }
  }

  onClick = event => {
    this.setState({show: !this.state.show}, () => {
      if (!this.state.show && this.props.onBlur) {
        this.props.onBlur();
      }
    });
  }

  onHide = () => {
    this.setState({show: false}, () => {
      if (this.props.onBlur) {
        this.props.onBlur();
      }
    });
  }

  getTarget = () => {
    return ReactDOM.findDOMNode(this._target);
  }

  render() {
    var {id, color, onChange, disabled, type, enableTransparent, transparent, onTransparentChange} = this.props;

    var text = <span>T</span>;
    if (type === 'bg') {
      text = <span className="fa fa-square-o"></span>;
    } else if (type === 'line') {
      text = <span className="fa fa-minus"></span>;
    } else if (type === 'btn') {
      text = <span className="fa fa-square"></span>;
    }
    return (
      <Button onClick={this.onClick} disabled={disabled} ref={b => { this._target = b }}>
        <Overlay rootClose={true} show={this.state.show} target={this.getTarget} placement="bottom" onHide={this.onHide}>
          <Popover id={id}>
            <ColorPicker color={color} onChangeComplete={onChange} enableTransparent={enableTransparent} transparent={transparent} onTransparentChange={onTransparentChange} />
          </Popover>
        </Overlay>
        <span style={{height:'20px',
                      width:'20px',
                      display: 'inline-block',
                      background: 'linear-gradient(to bottom right, #808080, #FAFAFA)'}}>
          {text}
        </span> <span className="caret"></span>
      </Button>
    );
  }
}

export class FormControlPopup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
    }
  }

  onClick = event => {
    this.setState({show: !this.state.show}, () => {
      if (!this.state.show && this.props.onBlur) {
        this.props.onBlur();
      }
    });
  }

  onHide = () => {
    this.setState({show: false}, () => {
      if (this.props.onBlur) {
        this.props.onBlur();
      }
    });
  }

  getTarget = () => {
    return ReactDOM.findDOMNode(this._target);
  }

  render() {
    var { id, obj, text, label, disabled, container, defValue, ...props } = this.props;
    return (
      <Button onClick={this.onClick} disabled={disabled} ref={b => {this._target = b} }>
        <Overlay rootClose={true} show={this.state.show} target={this.getTarget} placement="bottom" onHide={this.onHide}>
          <Popover id={id + '-popover'}>
            <FormGroup controlId={id}>
              {
                label && <ControlLabel>{label}</ControlLabel>
              }
              <FormControl {...props} value={_.isUndefined(obj[id])?defValue:obj[id]} />
            </FormGroup>
          </Popover>
        </Overlay>
        <span>{text}</span> <span className="caret"></span>
      </Button>
    );
  }
}

