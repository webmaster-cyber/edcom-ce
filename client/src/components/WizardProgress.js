import { Component } from "react";

export default class WizardProgress extends Component {

  onLinkClick = (url, event) => {
    event.preventDefault();

    this.props.onClick(url);
  }
    
  render() {
/*    var {active, disabled, id} = this.props;*/
    
    return (
    /*
      <ul id="progressbar2">
        <li className={`${active>=1?'active':''} ${active===1?'current':''}`}>
          { active !== 1  && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/broadcasts/settings?id=' + id)}>
              <span className="round-img">
                <img src="/img/step1-active.png" alt="" className="step-active" />
                <img src="/img/step1.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Settings</span>
            </a>
            :
            <div style={{cursor: disabled?'not-allowed':undefined}}>
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
            <a href="#l" onClick={this.onLinkClick.bind(null, '/broadcasts/template?id=' + id)}>
              <span className="round-img">
                <img src="/img/step2-active.png" alt="" className="step-active" />
                <img src="/img/step2.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Message</span>
            </a>
            :
            <div style={{cursor: disabled?'not-allowed':undefined}}>
              <span className="round-img">
                <img src="/img/step2-active.png" alt="" className="step-active" />
                <img src="/img/step2.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Message</span>
            </div>
          }
        </li>
        <li className={`${active>=3?'active':''} ${active===3?'current':''}`}>
          { active !== 3 && !disabled ?
            <a href="#l" onClick={this.onLinkClick.bind(null, '/broadcasts/rcpt?id=' + id)}>
              <span className="round-img">
                <img src="/img/step3-active.png" alt="" className="step-active" />
                <img src="/img/step3.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Recipients</span>
            </a>
            :
            <div style={{cursor: disabled?'not-allowed':undefined}}>
              <span className="round-img">
                <img src="/img/step3-active.png" alt="" className="step-active" />
                <img src="/img/step3.png" alt="" className="step" />
              </span>
              <span className="wi-txt">Recipients</span>
            </div>
          }
        </li>
      </ul>*/
      null
    );
  }
}
