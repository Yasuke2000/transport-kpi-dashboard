/* ============================================
   Export Utilities - Excel/XLSX export
   ============================================ */

const ExportUtils = (() => {

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatCurrencyExcel = (value) => {
        return Math.round(value * 100) / 100;
    };

    // --- Build Summary Sheet ---
    const buildSummarySheet = (kpis, filterDescription) => {
        const now = new Date();
        const rows = [
            ['Transport KPI Dashboard - Summary Report'],
            ['Generated:', now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB')],
            ['Period:', filterDescription || 'Last 30 days'],
            [],
            ['Key Performance Indicators'],
            ['Metric', 'Value'],
            ['Total Shipments', kpis.totalShipments],
            ['On-Time Delivery %', kpis.onTimePercent + '%'],
            ['Average Delay (minutes)', kpis.avgDelay],
            ['Total Revenue', kpis.totalRevenue],
            ['Average Cost per Shipment', kpis.avgCost],
            ['Active Routes', kpis.activeRoutes],
            [],
            ['Status Breakdown'],
            ['Status', 'Count', 'Percentage'],
            ['Delivered', kpis.deliveredCount, kpis.totalShipments > 0 ? Math.round((kpis.deliveredCount / kpis.totalShipments) * 100) + '%' : '0%'],
            ['In Transit', kpis.inTransitCount, kpis.totalShipments > 0 ? Math.round((kpis.inTransitCount / kpis.totalShipments) * 100) + '%' : '0%'],
            ['Delayed', kpis.delayedCount, kpis.totalShipments > 0 ? Math.round((kpis.delayedCount / kpis.totalShipments) * 100) + '%' : '0%'],
            ['Cancelled', kpis.cancelledCount, kpis.totalShipments > 0 ? Math.round((kpis.cancelledCount / kpis.totalShipments) * 100) + '%' : '0%']
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            { wch: 30 },
            { wch: 20 },
            { wch: 15 }
        ];

        // Merge title row
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

        return ws;
    };

    // --- Build Shipments Sheet ---
    const buildShipmentsSheet = (data) => {
        const headers = [
            'Order ID', 'Origin', 'Destination', 'Route Type',
            'Departure', 'Scheduled Arrival', 'Actual Arrival',
            'Status', 'Delay (min)', 'Cost (EUR)', 'Distance (km)',
            'Transport Type', 'Customer'
        ];

        const rows = data.map(record => [
            record.orderId,
            record.origin,
            record.destination,
            record.routeType,
            formatDate(record.departure),
            formatDate(record.scheduledArrival),
            formatDate(record.actualArrival),
            record.status,
            record.delayMinutes,
            formatCurrencyExcel(record.cost),
            record.distance,
            record.transportType,
            record.customer
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Column widths
        ws['!cols'] = [
            { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
            { wch: 14 }, { wch: 25 }
        ];

        // Auto filter
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };

        return ws;
    };

    // --- Build Charts Data Sheet ---
    const buildChartsDataSheet = (data) => {
        const rows = [];

        // Section 1: Volume by Day
        rows.push(['Shipment Volume by Day']);
        rows.push(['Date', 'Total', 'Delivered', 'Delayed', 'In Transit', 'Cancelled']);

        const dailyData = TransportDataGenerator.aggregateByDay(data);
        const sortedDates = Object.keys(dailyData).sort();
        sortedDates.forEach(date => {
            const records = dailyData[date];
            rows.push([
                date,
                records.length,
                records.filter(r => r.status === 'Delivered').length,
                records.filter(r => r.status === 'Delayed').length,
                records.filter(r => r.status === 'In Transit').length,
                records.filter(r => r.status === 'Cancelled').length
            ]);
        });

        rows.push([]);
        rows.push([]);

        // Section 2: Performance by Route
        rows.push(['Performance by Route Type']);
        rows.push(['Route Type', 'Total', 'On-Time', 'On-Time %', 'Delayed', 'Cancelled']);

        const routeData = TransportDataGenerator.aggregateByRoute(data);
        ['UK-EU', 'Ireland-EU', 'Intra-EU'].forEach(type => {
            const records = routeData[type] || [];
            const total = records.length;
            const onTime = records.filter(r => r.status === 'Delivered' && r.delayMinutes <= 15).length;
            const delayed = records.filter(r => r.status === 'Delayed').length;
            const cancelled = records.filter(r => r.status === 'Cancelled').length;
            rows.push([
                type, total, onTime,
                total > 0 ? Math.round((onTime / total) * 100) + '%' : '0%',
                delayed, cancelled
            ]);
        });

        rows.push([]);
        rows.push([]);

        // Section 3: Cost by Transport Type
        rows.push(['Cost by Transport Type']);
        rows.push(['Transport Type', 'Total Cost (EUR)', 'Shipments', 'Avg Cost (EUR)']);

        const typeData = TransportDataGenerator.aggregateByTransportType(data);
        ['Road', 'Ferry', 'Rail', 'Multimodal'].forEach(type => {
            const records = typeData[type] || [];
            const totalCost = records.reduce((s, r) => s + r.cost, 0);
            rows.push([
                type,
                formatCurrencyExcel(totalCost),
                records.length,
                records.length > 0 ? formatCurrencyExcel(totalCost / records.length) : 0
            ]);
        });

        rows.push([]);
        rows.push([]);

        // Section 4: Delay Distribution
        rows.push(['Delay Distribution']);
        rows.push(['Delay Range', 'Count']);

        const delayDist = TransportDataGenerator.getDelayDistribution(data);
        Object.entries(delayDist).forEach(([range, count]) => {
            rows.push([range, count]);
        });

        rows.push([]);
        rows.push([]);

        // Section 5: Top Routes
        rows.push(['Top 10 Routes by Volume']);
        rows.push(['Route', 'Shipments', '% of Total']);

        const topRoutes = TransportDataGenerator.getTopRoutes(data, 10);
        topRoutes.forEach(route => {
            rows.push([route.route, route.count, route.percentage + '%']);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
            { wch: 30 }, { wch: 18 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];

        return ws;
    };

    // --- Main Export Function ---
    const exportToExcel = (filteredData, kpis, filterDescription) => {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: Summary
        const summarySheet = buildSummarySheet(kpis, filterDescription);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Sheet 2: Shipments
        const shipmentsSheet = buildShipmentsSheet(filteredData);
        XLSX.utils.book_append_sheet(wb, shipmentsSheet, 'Shipments');

        // Sheet 3: Charts Data
        const chartsSheet = buildChartsDataSheet(filteredData);
        XLSX.utils.book_append_sheet(wb, chartsSheet, 'Charts Data');

        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Transport_KPI_Report_${dateStr}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);

        return filename;
    };

    // --- Export table only ---
    const exportTableToExcel = (filteredData) => {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }

        const wb = XLSX.utils.book_new();
        const shipmentsSheet = buildShipmentsSheet(filteredData);
        XLSX.utils.book_append_sheet(wb, shipmentsSheet, 'Shipments');

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Transport_Shipments_${dateStr}.xlsx`;

        XLSX.writeFile(wb, filename);
        return filename;
    };

    return {
        exportToExcel,
        exportTableToExcel
    };
})();
