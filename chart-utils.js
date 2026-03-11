/* ============================================
   Chart Utilities - Chart.js configurations
   ============================================ */

const ChartUtils = (() => {

    // --- Color palette ---
    const COLORS = {
        primary: '#2563EB',
        primaryLight: '#3B82F6',
        primaryBg: 'rgba(37, 99, 235, 0.1)',
        success: '#10B981',
        successLight: '#34D399',
        successBg: 'rgba(16, 185, 129, 0.1)',
        warning: '#F59E0B',
        warningLight: '#FBBF24',
        warningBg: 'rgba(245, 158, 11, 0.1)',
        danger: '#EF4444',
        dangerLight: '#F87171',
        dangerBg: 'rgba(239, 68, 68, 0.1)',
        purple: '#8B5CF6',
        purpleBg: 'rgba(139, 92, 246, 0.1)',
        orange: '#F97316',
        teal: '#14B8A6',
        gray: '#6B7280',
        grayLight: '#9CA3AF'
    };

    const CHART_DEFAULTS = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    pointStyleWidth: 10,
                    font: { family: "'Inter', sans-serif", size: 12 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                bodyFont: { family: "'Inter', sans-serif", size: 12 },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                boxPadding: 4
            }
        }
    };

    // --- Hex to RGBA helper ---
    const hexToRgba = (hex, alpha = 0.1) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // --- Sparkline creator ---
    const createSparkline = (canvasId, data, color = COLORS.primary) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data,
                    borderColor: color,
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: hexToRgba(color, 0.1),
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                elements: { line: { borderCapStyle: 'round' } }
            }
        });
    };

    // --- Chart 1: Shipment Volume Over Time ---
    const createVolumeChart = (canvasId, data, days = 30) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const dailyData = TransportDataGenerator.aggregateByDay(data);
        const labels = [];
        const totalCounts = [];
        const deliveredCounts = [];
        const delayedCounts = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            labels.push(formatDateShort(date));
            const dayRecords = dailyData[dateStr] || [];
            totalCounts.push(dayRecords.length);
            deliveredCounts.push(dayRecords.filter(d => d.status === 'Delivered').length);
            delayedCounts.push(dayRecords.filter(d => d.status === 'Delayed').length);
        }

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total',
                        data: totalCounts,
                        borderColor: COLORS.primary,
                        backgroundColor: COLORS.primaryBg,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: COLORS.primary
                    },
                    {
                        label: 'Delivered',
                        data: deliveredCounts,
                        borderColor: COLORS.success,
                        backgroundColor: COLORS.successBg,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: COLORS.success
                    },
                    {
                        label: 'Delayed',
                        data: delayedCounts,
                        borderColor: COLORS.danger,
                        backgroundColor: COLORS.dangerBg,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: COLORS.danger
                    }
                ]
            },
            options: {
                ...CHART_DEFAULTS,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF',
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF',
                            stepSize: 2
                        }
                    }
                },
                plugins: {
                    ...CHART_DEFAULTS.plugins,
                    tooltip: {
                        ...CHART_DEFAULTS.plugins.tooltip,
                        callbacks: {
                            title: (items) => items[0].label,
                            label: (item) => `  ${item.dataset.label}: ${item.raw} shipments`
                        }
                    }
                }
            }
        });
    };

    // --- Chart 2: Delivery Performance by Route ---
    const createPerformanceChart = (canvasId, data) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const routeData = TransportDataGenerator.aggregateByRoute(data);
        const routeTypes = ['UK-EU', 'Ireland-EU', 'Intra-EU'];
        const onTimeData = [];
        const delayedData = [];
        const cancelledData = [];

        routeTypes.forEach(type => {
            const records = routeData[type] || [];
            const total = records.length || 1;
            const onTime = records.filter(r => r.status === 'Delivered' && r.delayMinutes <= 15).length;
            const delayed = records.filter(r => r.status === 'Delayed' || (r.status === 'Delivered' && r.delayMinutes > 15)).length;
            const cancelled = records.filter(r => r.status === 'Cancelled').length;
            onTimeData.push(Math.round((onTime / total) * 100));
            delayedData.push(Math.round((delayed / total) * 100));
            cancelledData.push(Math.round((cancelled / total) * 100));
        });

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: routeTypes,
                datasets: [
                    {
                        label: 'On-Time',
                        data: onTimeData,
                        backgroundColor: COLORS.success,
                        borderRadius: 4,
                        borderSkipped: false
                    },
                    {
                        label: 'Delayed',
                        data: delayedData,
                        backgroundColor: COLORS.warning,
                        borderRadius: 4,
                        borderSkipped: false
                    },
                    {
                        label: 'Cancelled',
                        data: cancelledData,
                        backgroundColor: COLORS.danger,
                        borderRadius: 4,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                ...CHART_DEFAULTS,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            font: { size: 12, family: "'Inter', sans-serif", weight: '500' },
                            color: '#6B7280'
                        }
                    },
                    y: {
                        stacked: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF',
                            callback: (val) => val + '%'
                        }
                    }
                },
                plugins: {
                    ...CHART_DEFAULTS.plugins,
                    tooltip: {
                        ...CHART_DEFAULTS.plugins.tooltip,
                        callbacks: {
                            label: (item) => `  ${item.dataset.label}: ${item.raw}%`
                        }
                    }
                }
            }
        });
    };

    // --- Chart 3: Cost Analysis (Doughnut) ---
    const createCostChart = (canvasId, data) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const typeData = TransportDataGenerator.aggregateByTransportType(data);
        const labels = [];
        const costs = [];
        const colors = [COLORS.primary, COLORS.teal, COLORS.purple, COLORS.orange];

        ['Road', 'Ferry', 'Rail', 'Multimodal'].forEach((type, i) => {
            const records = typeData[type] || [];
            const totalCost = records.reduce((s, r) => s + r.cost, 0);
            labels.push(type);
            costs.push(Math.round(totalCost));
        });

        const totalCost = costs.reduce((a, b) => a + b, 0);

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: costs,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                ...CHART_DEFAULTS,
                cutout: '65%',
                plugins: {
                    ...CHART_DEFAULTS.plugins,
                    legend: {
                        ...CHART_DEFAULTS.plugins.legend,
                        position: 'bottom',
                        labels: {
                            ...CHART_DEFAULTS.plugins.legend.labels,
                            generateLabels: (chart) => {
                                const ds = chart.data.datasets[0];
                                return chart.data.labels.map((label, i) => ({
                                    text: `${label}: ${formatCurrency(ds.data[i])} (${Math.round((ds.data[i] / totalCost) * 100)}%)`,
                                    fillStyle: ds.backgroundColor[i],
                                    strokeStyle: ds.backgroundColor[i],
                                    lineWidth: 0,
                                    hidden: false,
                                    index: i,
                                    pointStyle: 'rectRounded'
                                }));
                            }
                        }
                    },
                    tooltip: {
                        ...CHART_DEFAULTS.plugins.tooltip,
                        callbacks: {
                            label: (item) => {
                                const pct = Math.round((item.raw / totalCost) * 100);
                                return `  ${item.label}: ${formatCurrency(item.raw)} (${pct}%)`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw(chart) {
                    const { ctx: c, chartArea } = chart;
                    const centerX = (chartArea.left + chartArea.right) / 2;
                    const centerY = (chartArea.top + chartArea.bottom) / 2;

                    c.save();
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';

                    c.font = "500 12px 'Inter', sans-serif";
                    c.fillStyle = '#9CA3AF';
                    c.fillText('Total Cost', centerX, centerY - 12);

                    c.font = "700 18px 'Inter', sans-serif";
                    c.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#111827';
                    c.fillText(formatCurrency(totalCost), centerX, centerY + 10);

                    c.restore();
                }
            }]
        });
    };

    // --- Chart 4: Delay Distribution (Histogram) ---
    const createDelayChart = (canvasId, data) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const distribution = TransportDataGenerator.getDelayDistribution(data);
        const labels = Object.keys(distribution);
        const values = Object.values(distribution);
        const gradientColors = [
            COLORS.success,
            '#84CC16',
            COLORS.warning,
            COLORS.orange,
            COLORS.danger
        ];

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Shipments',
                    data: values,
                    backgroundColor: gradientColors,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.7
                }]
            },
            options: {
                ...CHART_DEFAULTS,
                plugins: {
                    ...CHART_DEFAULTS.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...CHART_DEFAULTS.plugins.tooltip,
                        callbacks: {
                            label: (item) => `  ${item.raw} shipments`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF'
                        }
                    }
                }
            }
        });
    };

    // --- Chart 5: Top Routes (Horizontal Bar) ---
    const createTopRoutesChart = (canvasId, data) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const topRoutes = TransportDataGenerator.getTopRoutes(data, 10);
        const labels = topRoutes.map(r => r.route);
        const counts = topRoutes.map(r => r.count);
        const percentages = topRoutes.map(r => r.percentage);

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Shipments',
                    data: counts,
                    backgroundColor: COLORS.primary,
                    borderRadius: 4,
                    barPercentage: 0.7
                }]
            },
            options: {
                ...CHART_DEFAULTS,
                indexAxis: 'y',
                plugins: {
                    ...CHART_DEFAULTS.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...CHART_DEFAULTS.plugins.tooltip,
                        callbacks: {
                            label: (item) => {
                                const pct = percentages[item.dataIndex];
                                return `  ${item.raw} shipments (${pct}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#9CA3AF'
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11, family: "'Inter', sans-serif" },
                            color: '#6B7280'
                        }
                    }
                }
            }
        });
    };

    // --- Format helpers ---
    const formatCurrency = (value) => {
        return '\u20AC' + new Intl.NumberFormat('en-IE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDateShort = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    // --- Destroy chart safely ---
    const destroyChart = (chart) => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
        return null;
    };

    return {
        COLORS,
        createSparkline,
        createVolumeChart,
        createPerformanceChart,
        createCostChart,
        createDelayChart,
        createTopRoutesChart,
        formatCurrency,
        formatDateShort,
        destroyChart
    };
})();
