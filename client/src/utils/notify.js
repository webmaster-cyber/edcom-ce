import React from "react";
import shortid from "shortid";
import { notify } from "react-notify-toast";

class Notify {
  constructor() {
    this.lastid = null;
  }

  show(text, type, timeout) {
    var id = shortid.generate();
    this.lastid = id;

    notify.hide();
    notify.show(
      <span>{text} <span className="toast-dismiss" onClick={() => {
          this.lastid = null;
          notify.hide();
        }
      }>{'\u00D7'}</span></span>,
      type, -1
    );

    setTimeout(() => {
      if (id === this.lastid) {
        notify.hide();
      }
    }, timeout?timeout:7000);
  }
}

var n = new Notify();

export default n;

