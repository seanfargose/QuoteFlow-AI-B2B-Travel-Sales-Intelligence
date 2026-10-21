'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface FunnelItem {
  stage: string;
  count: number;
  fill: string;
}

interface FunnelChartProps {
  data: FunnelItem[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={130} />
          <Tooltip 
            formatter={(val: number) => [`${val} Deals`, 'Count']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
