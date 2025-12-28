import React, { Component } from "react";
import { FormControl, DropdownButton, MenuItem, Button, Modal } from "react-bootstrap";
import { EDFormGroup } from "./EDDOM";

export default class ConfirmDropdown extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
      isLoading: false,
      extra: '',
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  onClicked = () => {
    this.setState({showModal: true, extra: ''});
  }

  confirmClicked = async yes => {
    this.setState({showModal: false});

    if (yes) {
      this.setState({isLoading: true});
      try {
        await this.props.onConfirm();
      } finally {
        if (this._isMounted) {
          this.setState({isLoading: false});   
        }
      }
    }
  }

  onExtraChange = e => {
    this.setState({extra: e.target.value});
  }

  render() {
    var {id, prompt, extra, title, onConfirm, text, menu, children, style, disabled, bsSize, bsStyle, left, ...props} = this.props;

    return (
      <div style={{display: 'inline-block', ...style}} className={'confirm-button' + (left ? ' left' : '')}>
        <DropdownButton id={id} title={text} className="LoaderButton" bsSize={bsSize} bsStyle={bsStyle} disabled={this.state.isLoading} {...props}>
          {children}
          { menu &&
            <MenuItem onClick={this.onClicked} disabled={disabled}>{menu}</MenuItem>
          }
        </DropdownButton>
        {
          this.state.showModal &&
            <Modal show={true}>
              <Modal.Header>
                <Modal.Title>{title}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p>{prompt}</p>
                { extra &&
                  <EDFormGroup space>
                    <label style={{fontWeight:'normal'}}>Type 'delete' to confirm:</label>
                    {' '}
                    <FormControl id="extra" onChange={this.onExtraChange} value={this.state.extra} />
                  </EDFormGroup>
                }
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary" disabled={extra && this.state.extra !== 'delete'}>Yes</Button>
                <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
              </Modal.Footer>
            </Modal>
        }
      </div>
    );
  }

}
