import React, { Component } from "react";
import { MenuItem, Button, Glyphicon, SplitButton } from "react-bootstrap";
import _ from "underscore";
import "./LoaderButton.css";

export default class LoaderButton extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
    };

    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onClick = async (handler, event) => {
    if (handler) {
      this.setState({isLoading: true});
      try {
        await handler(event);
      } finally {
        if (this._isMounted) {
          this.setState({isLoading: false});
        }
      }
    }
  }

  render() {
    var {id, text, loadingText, className = "", disabled = false, onClick, splitItems, isLoading, ...props} = this.props;
    var isLoadingProp = isLoading;
    isLoading = this.state.isLoading;
    if (isLoadingProp)
      isLoading = true;

    if (splitItems) {
      return (
        <SplitButton
          id={id}
          className={`LoaderButton ${className}`}
          disabled={disabled || isLoading}
          onClick={this.onClick.bind(null, onClick)}
          title={!isLoading ? text : loadingText}
          {...props}
        >
          {
            _.map(splitItems, i => <MenuItem key={i.key?i.key:i.text} onClick={this.onClick.bind(null, i.onClick)} disabled={i.disabled}>{i.text}</MenuItem>)
          }
        </SplitButton>
      );
    } else {
      return (
        <Button
          className={`LoaderButton ${className}`}
          disabled={disabled || isLoading}
          onClick={this.onClick.bind(null, onClick)}
          {...props}
        >
          {isLoading && <Glyphicon glyph="refresh" className="spinning" />}
          {!isLoading ? text : loadingText}
        </Button>
      );
    }
  }
}

export function MenuLoaderButton({
  text,
  className = "",
  disabled = false,
  children,
  ...props
}) {
  return (
    <SplitButton title={text} className={`LoaderButton ${className}`} disabled={disabled} {...props}>
      {children}
    </SplitButton>
  );
}
