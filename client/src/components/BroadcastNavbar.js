import React, { Component } from "react";
import LoaderButton from "./LoaderButton";
import { Link } from "react-router-dom";
import { Navbar } from "react-bootstrap";

export default class WizardNavbar extends Component {

  linkClick = (url, event) => {
    event.preventDefault();

    this.props.onLinkClick(url);
  }
    
  render() {
    var props = this.props;

    var style = {};
    var cls='';

    if (props.black) {
      cls = 'navbar-black';
    }
    if (props.fixed) {
      style.position = 'fixed';
      style.top = 0;
      style.left = 0;
      style.right = 0;
      style.boxShadow = 'none';
      style.zIndex = 150;
    }
    
    return (
      <section id="save-sec2" className={cls} style={style}>
        <div className="left-side">
          {
            this.props.backText ?
              <div className="back-link">
                <a href={this.props.link} onClick={this.linkClick.bind(null, this.props.link)}>
                  <i className="back-arrow fa fa-arrow-left"/>
                  {' '}
                  <span>{this.props.backText}</span>
                </a>
              </div>
            :
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
          }
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
        {props.preheader}
        {props.buttons}
      </section>
    );
  }
}
