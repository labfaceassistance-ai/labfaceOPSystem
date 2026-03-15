'use client';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface AttendanceTrend {
    period: string;
    attendance_count: number;
    unique_students: number;
}

interface AttendanceChartProps {
    data: AttendanceTrend[];
}

export default function AttendanceChart({ data }: AttendanceChartProps) {
    const chartData = {
        labels: data.map(d => d.period),
        datasets: [
            {
                label: 'Total Attendance',
                data: data.map(d => d.attendance_count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Unique Students',
                data: data.map(d => d.unique_students),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: 'rgb(203, 213, 225)',
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: 'rgb(203, 213, 225)',
                bodyColor: 'rgb(203, 213, 225)',
                borderColor: 'rgb(51, 65, 85)',
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)',
                },
                ticks: {
                    color: 'rgb(148, 163, 184)',
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)',
                },
                ticks: {
                    color: 'rgb(148, 163, 184)'
                },
                beginAtZero: true
            }
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false
        }
    };

    return (
        <div style={{ height: '400px' }}>
            <Line data={chartData} options={options} />
        </div>
    );
}
