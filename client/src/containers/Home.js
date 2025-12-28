import React, { Component } from "react";
import LoaderIcon from "../components/LoaderIcon";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import { EDTableSection } from "../components/EDDOM";
import { Button } from "react-bootstrap";

import "./Home.css";

class OnboardingBlock extends Component {
  componentDidMount() {
    var vids = document.getElementsByClassName('video');

    for (var v = 0; v < vids.length; v++) {
      var vid = vids[v];

      var existing = vid.getElementsByTagName('script').length;
      for (var e = 0; e < existing; e++) {
        vid.removeChild(vid.childNodes[0]);
      }

      var first = vid.childNodes[0];

      var s = document.createElement('script');
      s.src = "https://fast.wistia.com/embed/medias/" + vid.id + ".jsonp";
      s.async = true;

      vid.insertBefore(s, first);

      s = document.createElement('script');
      s.src = "https://fast.wistia.com/assets/external/E-v1.js";
      s.async = true;

      vid.insertBefore(s, first);
    }
  }

  render() {
    var p = this.props;

    return (
      <div className="onboarding">
        <div className="video" id={p.videoid}>
          <span className={'wistia_embed wistia_async_' + p.videoid + ' popover=true popoverAnimateThumbnail=true'} style={{display:'inline-block',height:'178px',position:'relative',width:'316px'}}>&nbsp;</span>
        </div>
        <div className="box">
          <div className="title">
            {p.title}
          </div>
          <div className="description">
            {p.desc}
          </div>
          <a className="helplink" href={p.help} target="_blank">
            Read help article <i className="fa fa-external-link" />
          </a>
          {p.action && <Button className="green" onClick={p.onClick}>{p.action}</Button>}
        </div>
      </div>
    );
  }
}

class AdminOnboarding extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  onClick = url => {
    this.props.history.push(url);
  }
  render() {
    return (
      <div className="onboarding-parent">
        <OnboardingBlock title="Backend vs Frontend vs Customer Accounts"
                         videoid="d3vk5o2ray"
                         desc="Learn the basics of navigating your new email service provider as the postmaster."
                         help="https://docs.emaildelivery.com/docs/introduction/what-you-can-do-in-the-emaildelivery.com-backend" />
        <OnboardingBlock title="Sending Your First Email"
                         videoid="rcj33a5mgu"
                         desc="Connections → Postal Routes → Customer Accounts → Email Marketing Frontend."
                         onClick={this.onClick.bind(null, "/broadcasts/settings?id=new")}
                         help="https://docs.emaildelivery.com/docs/introduction/getting-ready-to-send" />
        <OnboardingBlock title="Connect SparkPost API" action="Connect SparkPost"
                         videoid="6m1dgu1af1"
                         desc="Integrate your SparkPost account."
                         onClick={this.onClick.bind(null, "/sparkpost/edit?id=new")}
                         help="https://docs.emaildelivery.com/docs/introduction/connect-sparkpost-api" />
        <OnboardingBlock title="Connect Mailgun API" action="Connect Mailgun"
                         videoid="jhet9uzyvs"
                         desc="Add an authenticated sending domain with Mailgun."
                         onClick={this.onClick.bind(null, "/mailgun/edit?id=new")}
                         help="https://docs.emaildelivery.com/docs/introduction/connect-mailgun-api" />
        <OnboardingBlock title="Connecting with SMTP Relay" action="Connect SMTP Relay"
                         videoid="rzsbt56zjw"
                         desc="Connect an SMTP Relay account using an ESP or MTA."
                         onClick={this.onClick.bind(null, "/smtprelays/edit?id=new")}  
                         help="https://docs.emaildelivery.com/docs/introduction/connect-smtp-relay" />
      </div>
    );
  }
}

class CustomerDash extends Component {
  componentDidMount() {
    this.props.history.replace('/broadcasts');
  }

  render() {
    return null;
  }
}

export default class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (!this.props.loggedInUID) {
      this.props.history.replace('/login');
    }
  }

  render() {
    const { user } = this.props;

    return (
      this.props.loggedInUID && !this.props.user ?
        <div className="text-center space20">
          <LoaderIcon/>
        </div>
      :
      <MenuNavbar {...this.props} isAdmin={this.props.user && this.props.user.admin && !this.props.loggedInImpersonate}>
        <div className="Home">
        {
          this.props.loggedInUID && user && !user.frontend &&
            <TitlePage title="Backend Dashboard" />
        }
        <EDTableSection>
          <div className="text-center">
            {
              !this.props.loggedInUID ?
                <div>
                  <h1>Please log in to access your portal</h1>
                </div>
              :
                !user ?
                    <div className="text-center">
                      <LoaderIcon/>
                    </div>
                  :
                    <div className="space30">
                      {
                        user.frontend ?
                          <CustomerDash stats={this.state.stats} contacts={this.state.contacts} history={this.props.history} />
                          :
                          <div>
                            <AdminOnboarding user={user} history={this.props.history} />
                            <div style={{clear: 'both', padding: '20px'}}></div>
                            <small style={{float: 'right'}}>Software version: {user.software_version}</small>
                          </div>
                      }
                    </div>
            }
          </div>
        </EDTableSection>
        </div>
      </MenuNavbar>
    );
  }
}