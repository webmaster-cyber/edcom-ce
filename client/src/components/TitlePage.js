import React from "react";
import { Grid, Row, Col } from "react-bootstrap";

import './TitlePage.css';

export default props => {
  return (
    <section id="broadcast" className={`title-page ${props.tabs ? 'with-tabs' : ''} ${props.className}`}>
      <Grid fluid>
        <Row className="row-wrapper flex-items">
          <Col xs={props.leftsize?props.leftsize:6} className="title-and-tabs-container">
            {props.title &&
              <h3>{props.title}</h3>
            }
            {props.tabs}
          </Col>
          {props.rightsize !== 0 &&
            <Col xs={props.rightsize?props.rightsize:6} className="buttons-container">
              {props.button && 
                <ul className="list-inline text-right">
                  <li>
                  {props.button}
                  </li>
                </ul>
              }
            </Col>
          }
        </Row>
      </Grid>
    </section>
  );
}
