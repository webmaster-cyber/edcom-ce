import React from "react";
import _ from "underscore";
import { PieChart, Pie, Label, Cell } from "recharts";

import './TablePie.css';

export default ({className, value, children, color, label, otherColors, otherValues, size = 45, thickness = 5, ...p}) => {
  if (!otherColors)
    otherColors = [];

  var left = 100 - value;
  var total = value;
  var data = [{name:'b', value: value}];
  _.each(otherValues, (v, i) => {
    data.splice(0, 0, {name: i, value: v});
    left -= v;
    total += v;
  });
  data.splice(0, 0, {name: 'a', value: left});

  var diameter = label ? size + 10 : size;

  return (
    <div className={`table-pie ${className ? className : ''}`}>
      <PieChart width={diameter} height={diameter}>
        <Pie dataKey="value" isAnimationActive={false}
            data={data}
            startAngle={90} endAngle={450} innerRadius={(diameter / 2) - thickness} outerRadius={(diameter / 2)}
        >
          {label &&
            <Label position="center" content={() =>
              <g>
                <text x={diameter / 2} y={diameter * .45} fontSize={diameter * .24} textAnchor="middle" fill={color}>
                  {Math.min(Math.round(total), 100).toString() + '%'}
                </text>
                <text x={diameter / 2} y={diameter * .7} fontSize={diameter * .13} textAnchor="middle" fill={color}>
                  {label}
                </text>
              </g>
            }/>
          }
          <Cell fill="#eceef5"/>
          {
            _.map(otherColors.reverse(), c => <Cell key={c} fill={c} />)
          }
          <Cell fill={color} />
        </Pie>
      </PieChart>
      {children && (
        <div
          className="children"
          style={{
            width: `${size - (thickness * 2)}px`,
            height: `${size - (thickness * 2)}px`,
            top: `${thickness}px`,
            left: `${thickness}px`
          }}>
          {children}
        </div>
      )}
    </div>
  );
}
