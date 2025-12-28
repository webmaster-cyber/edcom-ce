import React, { Component } from "react";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";

import "./Zapier.css";

export default class Pabbly extends Component {
  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Pabbly Integrations" />
        <div id="int">
          <div style={{ margin: "20px 0", textAlign: "center" }}>
            <div>
              <p>
                Connect Pabbly to your email marketing platform using our private white-label integration:
              </p>
              <p>
                <a href="https://connect.pabbly.com/share-app/CUFVZ1UCAmFUHlU_D2pQdw4aUlZTCghsUksBE1JdBX1SHwZDBEVaMApGVXdWFQloUxoDaVIOAzgNGQIGUAYBcgEYByhTTFYLVmVUEVQLXXcJa1UiVR4COFQFVWYPR1BqDjdSdVMeCFVSXAE8UkkFQ1ILBn0ESVpECkpVPVYZCSNTNANqUgsDIw00" target="_blank" rel="noopener noreferrer">Click Here to Connect</a>
              </p>
            </div>
          </div>
        </div>
      </MenuNavbar>
    );
  }
}