import React from "react";
import _ from "underscore";
import { PieChart, Pie, Cell } from "recharts";

import './TablePie.css';

export default ({className, value, color, label, otherColors, otherValues, size = 45, thickness = 5, ...p}) => {
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

  return (
    <div className={`table-pie table-pie2 ${className ? className : ''}`}>
      <PieChart width={size} height={size}>
        <Pie dataKey="value" isAnimationActive={false}
            data={data}
            startAngle={90} endAngle={450}
            innerRadius={(size / 2) - thickness} outerRadius={(size / 2)}
        >
          <Cell fill="#eceef5"/>
          {
            _.map(otherColors.reverse(), c => <Cell key={c} fill={c} />)
          }
          <Cell fill={color} />
        </Pie>
      </PieChart>
      {label &&
        <div className="table-pie2-label">
            <div className="table-pie2-label-pct">
                {Math.min(Math.round(total), 100).toString() + '%'}
            </div>
            <div className="table-pie2-label-text">
                {label}
            </div>
        </div>
      }
    </div>
  );
}
