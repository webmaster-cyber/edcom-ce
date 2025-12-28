import React, { Component } from "react";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";

import "./Zapier.css";

export default class Zapier extends Component {
  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Zapier Integrations" />
        <div id="int">
          <div style={{ margin: "20px 0", textAlign: "center" }}>
            <div>
              <p>
                Connect Zapier to your email marketing platform using our private white-label integration:
              </p>
              <p>
                <a href="https://zapier.com/developer/public-invite/135514/35329bdced8e5b2df22ba3a0a0a7636b/" target="_blank" rel="noopener noreferrer">Click Here to Connect</a>
              </p>
            </div>
          </div>
        </div>
      </MenuNavbar>
    );
  }
}