import React from "react";
import MenuNavbar from "../components/MenuNavbar";

import "./NotFound.css";

export default ({...props}) =>
  <MenuNavbar {...props} isAdmin={props.user && props.user.admin && !props.loggedInImpersonate}>
    <div className="NotFound">
      <h3>Sorry, page not found!</h3>
    </div>
  </MenuNavbar>
