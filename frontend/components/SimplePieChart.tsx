import React from 'react';

interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface SimplePieChartProps {
    data: PieChartData[];
    size?: number;
}

export default function SimplePieChart({ data, size = 200 }: SimplePieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <p className="text-slate-500 text-sm">No data available</p>
            </div>
        );
    }

    let currentAngle = -90; // Start from top

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Pie Chart SVG */}
            <svg width={size} height={size} viewBox="0 0 100 100">
                {data.map((item, index) => {
                    const percentage = (item.value / total) * 100;
                    const angle = (percentage / 100) * 360;

                    // Calculate path for pie slice
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const x1 = 50 + 45 * Math.cos(startRad);
                    const y1 = 50 + 45 * Math.sin(startRad);
                    const x2 = 50 + 45 * Math.cos(endRad);
                    const y2 = 50 + 45 * Math.sin(endRad);

                    const largeArc = angle > 180 ? 1 : 0;

                    const pathData = [
                        `M 50 50`,
                        `L ${x1} ${y1}`,
                        `A 45 45 0 ${largeArc} 1 ${x2} ${y2}`,
                        `Z`
                    ].join(' ');

                    currentAngle += angle;

                    return (
                        <path
                            key={index}
                            d={pathData}
                            fill={item.color}
                            stroke="rgba(15, 23, 42, 0.5)"
                            strokeWidth="0.5"
                        />
                    );
                })}

                {/* Center circle for donut effect */}
                <circle cx="50" cy="50" r="25" fill="rgb(15, 23, 42)" />
            </svg>

            {/* Legend */}
            <div className="flex flex-col gap-2 w-full">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-300">{item.label}</span>
                        </div>
                        <span className="text-white font-medium">
                            {item.value} ({((item.value / total) * 100).toFixed(0)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
