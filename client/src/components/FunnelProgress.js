import React, { Component } from "react";

export default class FunnelProgress extends Component {
  onClick = (url, event) => {
    event.preventDefault();

    this.props.onClick(url);
  }
    
  render() {
    var {active, disabled, id} = this.props;
    
    return (
      <ul id="progressbar">
        <li className={`${active>=1?'active':''} ${active===1?'current':''}`}>
          { active !== 1  && !disabled ?
            <a href="#s" onClick={this.onClick.bind(null, '/funnels/settings?id=' + id)}>
              <span className="round-img">
                <img src="/img/step1-active.png" alt="" className="step-active" />
                <img src="/img/step1.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Settings</span>
            </a>
            :
            <div>
              <span className="round-img">
                <img src="/img/step1-active.png" alt="" className="step-active" />
                <img src="/img/step1.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Settings</span>
            </div>
          }
        </li>
        <li className={`${active>=2?'active':''} ${active===2?'current':''}`}>
          { active !== 2 && !disabled ?
            <a href="#m" onClick={this.onClick.bind(null, '/funnels/message?id=' + id)}>
              <span className="round-img">
                <img src="/img/step2-active.png" alt="" className="step-active" />
                <img src="/img/step2.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Messages</span>
            </a>
            :
            <div style={{cursor: disabled?'not-allowed':undefined}}>
              <span className="round-img">
                <img src="/img/step2-active.png" alt="" className="step-active" />
                <img src="/img/step2.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Messages</span>
            </div>
          }
        </li>
      </ul>
    );
  }
}
