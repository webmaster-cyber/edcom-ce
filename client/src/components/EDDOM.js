import React, { Component } from "react";
import { Grid, Row, Col, FormGroup } from "react-bootstrap";
import $ from "jquery";

import './EDDOM.css'

window.jQuery = window.$ = $;

require("@activix/double-scroll/jquery.doubleScroll.js");

export function EDFormSection({...p}) {
  return (
    <section id="wizard-sec">
      <div className="container-fluid">
        <Row className={p.noShadow?'':'box-shadow'}>
          <Col md={12}>
            <form id={p.noid?'':'msform'} onSubmit={p.onSubmit} ref={p.formRef} style={{marginTop:p.nospace?0:undefined, marginLeft:p.nospace?'-15px':undefined,marginRight:p.nospace?'-15px':undefined, marginBottom: (p.nospace||p.nobottomspace)?0:undefined}}>
              <button type="submit" style={{display:'none'}} />
              <fieldset>
                {p.children}
              </fieldset>
            </form>
          </Col>
        </Row>
      </div>
    </section>
  );
}

export function EDFormBox({...p}) {
  var cn = 'white-box';
  if (p.border)
    cn += ' border';
  else
    cn += ' border1';
  if (p.space)
    cn += ' space30';
  if (p.className)
    cn += ' ' + p.className
  return (
    <div className={cn} style={p.style}>
      {p.children}
    </div>
  );
}

export function EDFormGroup({...p}) {
  var cn = '';
  if (p.space)
    cn = 'space30';
  if (p.className)
    cn += ' ' + p.className
  if (p.inline) {
    return (
      <FormGroup style={p.style} className={cn}>
        {p.children}
      </FormGroup>
    );
  } else {
    return (
      <Row style={p.style} className={cn}>
        <Col md={12}>
          {p.children}
        </Col>
      </Row>
    );
  }
}

export function EDTableSection({...p}) {
  return (
    <section id="table-sec" className={p.className}>
      <Grid fluid>
        <Row>
          <Col md={12}>
            {p.children}
          </Col>
        </Row>
      </Grid>
    </section>
  );
}

export class EDTable extends Component {
  componentDidMount() {
    $(this._r).doubleScroll({resetOnWindowResize: true});
  }

  render() {
    var { minWidth, maxWidth, ...p } = this.props;

    var style = {}

    if (minWidth) style.minWidth = minWidth;
    if (maxWidth) style.maxWidth = maxWidth;

    return (
      <div className={!p.nospace ? 'space50' : ''}>
        <div className={`ed-table ${p.className ? p.className : ''}`}
          ref={r => this._r = r}>
          <table className="table" style={style}>
            {p.children}
          </table>
        </div>
      </div>
    );
  }
}

export function EDTableRow({...p}) {
  return (
    <tbody key={p.key} className={p.className}>
      {
        p.topExtra
      }
      <tr className={p.index===0?'table-row-first':'table-row'}>
        {p.children}
      </tr>
      {
        p.extra
      }
      { !p.nospace &&
      <tr>
        {p.children.map((c, i) => <td key={i} style={{padding:'10px 0'}}></td>)}
      </tr>
      }
    </tbody>
  );
}

export function EDTabs({...p}) {
  return (
    <div className="tabbable-panel">
      <div className="tabbable-line">
        {p.children}
      </div>
    </div>
  );
}

export function EDCard({...p}) {
  return (
    <div className="ed-card">
      <div className="card-header">
        {p.header}
      </div>
      <div className="card-body">
        {p.children}
      </div>
    </div>
  )
}

export function EDCardsContainer({...p}) {
  return (
    <div className="ed-cards-container">
      {p.children}
    </div>
  )
}
