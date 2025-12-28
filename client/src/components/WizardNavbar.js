import React, { Component } from "react";
import LoaderButton from "./LoaderButton";
import { Link } from "react-router-dom";
import { Navbar } from "react-bootstrap";

export default class WizardNavbar extends Component {
    
  render() {
    var props = this.props;
    
    return (
      <section id="save-sec">
        <div className="left-side">
          <Navbar.Brand>
            <Link to={this.props.link} className={props.brandText?'text-nav-link':''}>
              {props.brandText}
              {!props.brandText && props.isAdmin ?
                <img className="logoimg" src="/img/logo.png" alt="logo" />
                :
                (props.user && props.user.frontend &&
                <img className="logoimg" src={props.user.frontend.image || '/img/logo.png'} alt="logo" />)
              }
            </Link>
          </Navbar.Brand>
        </div>
        {!props.buttons &&
          <div className="right-side text-right">
            {props.green ?
              <LoaderButton
                className="green-button"
                text={props.exitText ? props.exitText : "Save and Exit"}
                loadingText="Saving..."
                disabled={props.disabled || props.isSaving}
                onClick={props.onExit}
              />
              :
              <LoaderButton
                bsStyle="primary"
                text={props.exitText ? props.exitText : "Save and Exit"}
                loadingText="Saving..."
                disabled={props.disabled || props.isSaving}
                onClick={props.onExit}
              />
            }
          </div>
        }
        {props.buttons}
      </section>
    );
  }
}
