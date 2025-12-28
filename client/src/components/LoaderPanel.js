import React from "react";
import LoaderIcon from "./LoaderIcon"

export default (props) =>
  props.isLoading ?
    <div className="space-top text-center">
      <LoaderIcon/>
    </div>
  :
    <div>
      {props.children}
    </div>
