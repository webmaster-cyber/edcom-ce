import React, { Component } from "react";
import { FormControl, Button, Modal } from "react-bootstrap";
import LoaderButton, { MenuLoaderButton } from "./LoaderButton";
import { EDFormGroup } from "./EDDOM";

export default class ConfirmButton extends Component {
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
    return (
      <div style={{display: 'inline-block', ...this.props.style}} className="confirm-button">
        {
          this.props.split ?
            <MenuLoaderButton id={this.props.id} onClick={this.onClicked} disabled={this.state.isLoading || this.props.disabled} text={this.props.text} bsSize={this.props.bsSize} bsStyle={this.props.bsStyle}>
              {this.props.children}
            </MenuLoaderButton>
          :
            <LoaderButton onClick={this.onClicked} disabled={this.state.isLoading || this.props.disabled} text={this.props.text} bsSize={this.props.bsSize} bsStyle={this.props.bsStyle} className={this.props.className} block={this.props.block} />
        }
        {
          this.state.showModal &&
            <Modal show={true}>
              <Modal.Header>
                <Modal.Title>{this.props.title}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p>{this.props.prompt}</p>
                { this.props.extra &&
                  <EDFormGroup space>
                    <label style={{fontWeight:'normal'}}>Type 'delete' to confirm:</label>
                    {' '}
                    <FormControl id="extra" onChange={this.onExtraChange} value={this.state.extra} />
                  </EDFormGroup>
                }
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary" disabled={this.props.extra && this.state.extra !== 'delete'}>Yes</Button>
                <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
              </Modal.Footer>
            </Modal>
        }
      </div>
    );
  }

}
