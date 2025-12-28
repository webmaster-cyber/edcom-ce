import React, { Component } from "react";

export default class WizardProgress extends Component {

  onLinkClick = (url, event) => {
    event.preventDefault();

    this.props.onClick(url);
  }
    
  render() {
    var {active, disabled, id} = this.props;
    
    return (
      <ul id="progressbar">
        <li className={`${active>=1?'active':''} ${active===1?'current':''}`}>
          { active !== 1  && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/policies/domains?id=' + id)}>
              <span className="round-img">
                <i className="step-active fa fa-globe" />
                <i className="step fa fa-globe" />
              </span>
              <span className="wi-txt">Domains</span>
            </a>
            :
            <div>
              <span className="round-img">
                <i className="step-active fa fa-globe" />
                <i className="step fa fa-globe" />
              </span>
              <span className="wi-txt">Domains</span>
            </div>
          }
        </li>
        <li className={`${active>=2?'active':''} ${active===2?'current':''}`}>
          { active !== 2  && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/policies/settings?id=' + id)}>
              <span className="round-img">
                <i className="step-active fa fa-cog" />
                <i className="step fa fa-cog" />
              </span>
              <span className="wi-txt">Settings</span>
            </a>
            :
            <div>
              <span className="round-img">
                <i className="step-active fa fa-cog" />
                <i className="step fa fa-cog" />
              </span>
              <span className="wi-txt">Settings</span>
            </div>
          }
        </li>
        <li className={`${active>=3?'active':''} ${active===3?'current':''}`}>
          { active !== 3 && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/policies/deferrals?id=' + id)}>
              <span className="round-img">
                <i className="step-active fa fa-pause" />
                <i className="step fa fa-pause" />
              </span>
              <span className="wi-txt">Deferrals</span>
            </a>
            :
            <div>
              <span className="round-img">
                <i className="step-active fa fa-pause" />
                <i className="step fa fa-pause" />
              </span>
              <span className="wi-txt">Deferrals</span>
            </div>
          }
        </li>
        <li className={`${active>=4?'active':''} ${active===4?'current':''}`}>
          { active !== 4 && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/policies/servers?id=' + id)}>
              <span className="round-img">
                <i className="step-active fa fa-server" />
                <i className="step fa fa-server" />
              </span>
              <span className="wi-txt">Servers</span>
            </a>
            :
            <div>
              <span className="round-img">
                <i className="step-active fa fa-server" />
                <i className="step fa fa-server" />
              </span>
              <span className="wi-txt">Servers</span>
            </div>
          }
        </li>
      </ul>
    );
  }
}
