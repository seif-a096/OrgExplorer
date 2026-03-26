import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface LanguageChartProps {
  data: { name: string; value: number; color: string }[];
}

export function LanguageChart({ data }: LanguageChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-github-dark border border-github-border rounded-xl p-6 flex items-center justify-center h-[300px]">
        <p className="text-github-muted">No language data available</p>
      </div>
    );
  }

  return (
    <div className="bg-github-dark border border-github-border rounded-xl p-6 h-[380px] flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Top Languages</h3>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d1117',
                borderColor: '#30363d',
                color: '#c9d1d9',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [`${value} repos`, 'Usage']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-github-text ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
