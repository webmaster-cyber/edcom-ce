import React from "react";

import "./InfoBox.css"

export default ({title, info, style}) =>
  <div className="info-box" style={style || {}}>
    <p>{title}</p>
    <p style={{fontWeight: 'bold'}}>{info}</p>
  </div>
