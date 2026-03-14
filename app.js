/* ============================================
   Transport KPI Dashboard - Main Application
   ============================================ */

const App = (() => {

    // --- State ---
    let allData = [];
    let filteredData = [];
    let currentKPIs = {};
    let charts = {};
    let sparklines = {};
    let currentPage = 1;
    let sortColumn = 'departure';
    let sortDirection = 'desc';
    let volumeChartDays = 30;

    const ROWS_PER_PAGE = 50;

    // --- Filter state ---
    let filters = {
        search: '',
        dateRange: 30,
        dateFrom: null,
        dateTo: null,
        routeTypes: ['UK-EU', 'Ireland-EU', 'Intra-EU'],
        statuses: ['Delivered', 'In Transit', 'Delayed', 'Cancelled'],
        transportTypes: ['Road', 'Ferry', 'Rail', 'Multimodal'],
        costMin: 0,
        costMax: 10000
    };

    // --- Debounce utility ---
    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    // --- Toast notification ---
    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                : type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
            </svg>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- Format helpers ---
    const formatCurrency = (value) => {
        return '\u20AC' + new Intl.NumberFormat('en-IE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(value));
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-IE').format(value);
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // --- Animated counter ---
    const animateValue = (element, start, end, suffix = '', prefix = '', duration = 800) => {
        const startTime = performance.now();
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.round(start + (end - start) * eased);
            element.textContent = prefix + formatNumber(current) + suffix;
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
    };

    // --- Initialize ---
    const init = () => {
        // Generate data
        allData = TransportDataGenerator.generate(750, 90);

        // Apply initial filters
        applyFilters(false);

        // Setup event listeners
        setupEventListeners();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Load saved state
        loadFilterState();

        // Update timestamp
        updateTimestamp();

        // Hide loading
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 600);

        // Load dark mode preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    };

    // --- Apply Filters ---
    const applyFilters = (notify = true) => {
        const now = new Date();
        let dateFrom, dateTo;

        if (filters.dateFrom && filters.dateTo) {
            dateFrom = new Date(filters.dateFrom);
            dateTo = new Date(filters.dateTo);
            dateTo.setHours(23, 59, 59, 999);
        } else {
            dateTo = now;
            dateFrom = new Date(now);
            dateFrom.setDate(dateFrom.getDate() - filters.dateRange);
        }

        filteredData = allData.filter(record => {
            const depDate = new Date(record.departure);
            if (depDate < dateFrom || depDate > dateTo) return false;
            if (!filters.routeTypes.includes(record.routeType)) return false;
            if (!filters.statuses.includes(record.status)) return false;
            if (!filters.transportTypes.includes(record.transportType)) return false;
            if (record.cost < filters.costMin || record.cost > filters.costMax) return false;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                if (!record.orderId.toLowerCase().includes(q) &&
                    !record.customer.toLowerCase().includes(q) &&
                    !record.origin.toLowerCase().includes(q) &&
                    !record.destination.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });

        // Get previous period for trend comparison
        const periodDays = filters.dateRange || 30;
        const prevStart = new Date(dateFrom);
        prevStart.setDate(prevStart.getDate() - periodDays);

        const previousData = allData.filter(record => {
            const depDate = new Date(record.departure);
            return depDate >= prevStart && depDate < dateFrom &&
                   filters.routeTypes.includes(record.routeType) &&
                   filters.statuses.includes(record.status) &&
                   filters.transportTypes.includes(record.transportType);
        });

        currentKPIs = TransportDataGenerator.calculateKPIs(filteredData, previousData);

        // Reset page
        currentPage = 1;

        // Update all views
        updateKPIs();
        updateCharts();
        updateTable();

        if (notify) {
            showToast(`Filters applied - ${filteredData.length} records found`, 'success');
        }

        // Save state
        saveFilterState();
    };

    // --- Update KPIs ---
    const updateKPIs = () => {
        const kpiElements = [
            { id: 'kpi-total-shipments', value: currentKPIs.totalShipments, suffix: '', prefix: '' },
            { id: 'kpi-on-time', value: currentKPIs.onTimePercent, suffix: '%', prefix: '' },
            { id: 'kpi-avg-delay', value: currentKPIs.avgDelay, suffix: ' min', prefix: '' },
            { id: 'kpi-total-revenue', value: currentKPIs.totalRevenue, suffix: '', prefix: '\u20AC' },
            { id: 'kpi-avg-cost', value: currentKPIs.avgCost, suffix: '', prefix: '\u20AC' },
            { id: 'kpi-active-routes', value: currentKPIs.activeRoutes, suffix: '', prefix: '' }
        ];

        kpiElements.forEach((kpi, index) => {
            const el = document.getElementById(kpi.id);
            if (el) {
                const currentVal = parseInt(el.textContent.replace(/[^\d]/g, '')) || 0;
                animateValue(el, currentVal, kpi.value, kpi.suffix, kpi.prefix);
            }
        });

        // Update trends
        if (currentKPIs.trends) {
            updateTrend('kpi-total-shipments-trend', currentKPIs.trends.totalShipments);
            updateTrend('kpi-on-time-trend', currentKPIs.trends.onTimePercent);
            updateTrend('kpi-avg-delay-trend', currentKPIs.trends.avgDelay);
            updateTrend('kpi-total-revenue-trend', currentKPIs.trends.totalRevenue);
            updateTrend('kpi-avg-cost-trend', currentKPIs.trends.avgCost);
            updateTrend('kpi-active-routes-trend', currentKPIs.trends.activeRoutes);
        }

        // Update on-time color indicator
        const onTimeCard = document.querySelector('[data-kpi="onTimeDelivery"]');
        if (onTimeCard) {
            onTimeCard.classList.remove('kpi-card--green', 'kpi-card--yellow', 'kpi-card--red');
            if (currentKPIs.onTimePercent >= 95) {
                onTimeCard.style.borderTop = '3px solid var(--color-success)';
            } else if (currentKPIs.onTimePercent >= 90) {
                onTimeCard.style.borderTop = '3px solid var(--color-warning)';
            } else {
                onTimeCard.style.borderTop = '3px solid var(--color-danger)';
            }
        }

        // Update sparklines
        updateSparklines();

        // Stagger fade-in animation
        document.querySelectorAll('.kpi-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('visible'), i * 100);
        });
    };

    const updateTrend = (elementId, trend) => {
        const el = document.getElementById(elementId);
        if (!el || !trend) return;

        const arrow = trend.direction === 'up' ? '\u2191' : trend.direction === 'down' ? '\u2193' : '\u2192';
        const cls = trend.direction === 'up' ? 'kpi-card__trend--up' :
                    trend.direction === 'down' ? 'kpi-card__trend--down' :
                    'kpi-card__trend--neutral';

        el.className = `kpi-card__trend ${cls}`;
        el.textContent = `${arrow} ${Math.abs(trend.value)}% vs prev period`;
    };

    // --- Update Sparklines ---
    const updateSparklines = () => {
        const sparklineConfigs = [
            { id: 'sparkline-shipments', metric: 'count', color: '#2563EB' },
            { id: 'sparkline-ontime', metric: 'ontime', color: '#10B981' },
            { id: 'sparkline-delay', metric: 'delay', color: '#F59E0B' },
            { id: 'sparkline-revenue', metric: 'revenue', color: '#8B5CF6' },
            { id: 'sparkline-cost', metric: 'avgcost', color: '#F97316' },
            { id: 'sparkline-routes', metric: 'routes', color: '#14B8A6' }
        ];

        sparklineConfigs.forEach(config => {
            sparklines[config.id] = ChartUtils.destroyChart(sparklines[config.id]);
            const data = TransportDataGenerator.getSparklineData(filteredData, 14, config.metric);
            sparklines[config.id] = ChartUtils.createSparkline(config.id, data, config.color);
        });
    };

    // --- Update Charts ---
    const updateCharts = () => {
        // Destroy existing charts
        Object.keys(charts).forEach(key => {
            charts[key] = ChartUtils.destroyChart(charts[key]);
        });

        // Recreate
        charts.volume = ChartUtils.createVolumeChart('chart-volume', filteredData, volumeChartDays);
        charts.performance = ChartUtils.createPerformanceChart('chart-performance', filteredData);
        charts.cost = ChartUtils.createCostChart('chart-cost', filteredData);
        charts.delay = ChartUtils.createDelayChart('chart-delay', filteredData);
        charts.routes = ChartUtils.createTopRoutesChart('chart-routes', filteredData);
    };

    // --- Update Data Table ---
    const updateTable = () => {
        // Sort data
        const sorted = [...filteredData].sort((a, b) => {
            let valA, valB;
            switch (sortColumn) {
                case 'orderId': valA = a.orderId; valB = b.orderId; break;
                case 'route': valA = a.route; valB = b.route; break;
                case 'departure': valA = a.departure; valB = b.departure; break;
                case 'arrival': valA = a.actualArrival || a.scheduledArrival; valB = b.actualArrival || b.scheduledArrival; break;
                case 'status': valA = a.status; valB = b.status; break;
                case 'delay': valA = a.delayMinutes; valB = b.delayMinutes; break;
                case 'cost': valA = a.cost; valB = b.cost; break;
                case 'transportType': valA = a.transportType; valB = b.transportType; break;
                case 'customer': valA = a.customer; valB = b.customer; break;
                default: valA = a.departure; valB = b.departure;
            }
            if (typeof valA === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * ROWS_PER_PAGE;
        const pageData = sorted.slice(start, start + ROWS_PER_PAGE);

        const tbody = document.getElementById('table-body');
        tbody.innerHTML = pageData.map(record => {
            const statusClass = record.status === 'Delivered' ? 'delivered' :
                                record.status === 'In Transit' ? 'transit' :
                                record.status === 'Delayed' ? 'delayed' : 'cancelled';
            return `<tr>
                <td><strong>${record.orderId}</strong></td>
                <td>${record.route}</td>
                <td>${formatDateTime(record.departure)}</td>
                <td>${formatDateTime(record.actualArrival || record.scheduledArrival)}</td>
                <td><span class="status-badge status-badge--${statusClass}">${record.status}</span></td>
                <td>${record.delayMinutes > 0 ? record.delayMinutes + ' min' : '-'}</td>
                <td>${formatCurrency(record.cost)}</td>
                <td>${record.transportType}</td>
                <td>${record.customer}</td>
            </tr>`;
        }).join('');

        // Update pagination
        document.getElementById('table-count').textContent = `${sorted.length} records`;
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;

        // Update sort indicators
        document.querySelectorAll('.data-table__th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === sortColumn) {
                th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    };

    // --- Update Timestamp ---
    const updateTimestamp = () => {
        const now = new Date();
        document.getElementById('report-timestamp').textContent =
            'Last updated: ' + now.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
    };

    // --- Setup Event Listeners ---
    const setupEventListeners = () => {
        // Sidebar toggle (mobile)
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('visible');
        });

        document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
        document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

        // Search (debounced)
        document.getElementById('search-input').addEventListener('input', debounce((e) => {
            filters.search = e.target.value.trim();
        }, 300));

        // Date presets
        document.querySelectorAll('.date-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filters.dateRange = parseInt(btn.dataset.days);
                filters.dateFrom = null;
                filters.dateTo = null;
                document.getElementById('date-from').value = '';
                document.getElementById('date-to').value = '';
            });
        });

        // Custom date range
        document.getElementById('date-from').addEventListener('change', (e) => {
            filters.dateFrom = e.target.value;
            document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
        });

        document.getElementById('date-to').addEventListener('change', (e) => {
            filters.dateTo = e.target.value;
            document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
        });

        // Route type checkboxes
        setupCheckboxGroup('route-type-filters', (values) => {
            filters.routeTypes = values;
        });

        // Status checkboxes
        setupCheckboxGroup('status-filters', (values) => {
            filters.statuses = values;
        });

        // Transport type checkboxes
        setupCheckboxGroup('transport-type-filters', (values) => {
            filters.transportTypes = values;
        });

        // Cost range sliders
        const costMin = document.getElementById('cost-min');
        const costMax = document.getElementById('cost-max');
        const costMinDisplay = document.getElementById('cost-min-display');
        const costMaxDisplay = document.getElementById('cost-max-display');

        const updateCostRange = () => {
            let min = parseInt(costMin.value);
            let max = parseInt(costMax.value);
            if (min > max) { [min, max] = [max, min]; }
            filters.costMin = min;
            filters.costMax = max;
            costMinDisplay.textContent = '\u20AC' + formatNumber(min);
            costMaxDisplay.textContent = '\u20AC' + formatNumber(max);
        };

        costMin.addEventListener('input', updateCostRange);
        costMax.addEventListener('input', updateCostRange);

        // Apply filters button
        document.getElementById('apply-filters-btn').addEventListener('click', () => {
            applyFilters();
            closeSidebar();
        });

        // Reset filters button
        document.getElementById('reset-filters-btn').addEventListener('click', resetFilters);

        // Chart range buttons (volume chart)
        document.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                volumeChartDays = parseInt(btn.dataset.range);
                charts.volume = ChartUtils.destroyChart(charts.volume);
                charts.volume = ChartUtils.createVolumeChart('chart-volume', filteredData, volumeChartDays);
            });
        });

        // Table sort
        document.querySelectorAll('.data-table__th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (sortColumn === col) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortDirection = 'asc';
                }
                updateTable();
            });
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; updateTable(); }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
            if (currentPage < totalPages) { currentPage++; updateTable(); }
        });

        // Export buttons
        document.getElementById('export-btn').addEventListener('click', handleExport);
        document.getElementById('export-table-btn').addEventListener('click', handleTableExport);

        // Dark mode toggle
        document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);

        // Print
        document.getElementById('print-btn').addEventListener('click', () => window.print());
    };

    // --- Checkbox group helper ---
    const setupCheckboxGroup = (containerId, callback) => {
        const container = document.getElementById(containerId);
        container.addEventListener('change', () => {
            const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            callback(checked);
        });
    };

    // --- Close sidebar ---
    const closeSidebar = () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
    };

    // --- Reset Filters ---
    const resetFilters = () => {
        filters = {
            search: '',
            dateRange: 30,
            dateFrom: null,
            dateTo: null,
            routeTypes: ['UK-EU', 'Ireland-EU', 'Intra-EU'],
            statuses: ['Delivered', 'In Transit', 'Delayed', 'Cancelled'],
            transportTypes: ['Road', 'Ferry', 'Rail', 'Multimodal'],
            costMin: 0,
            costMax: 10000
        };

        // Reset UI
        document.getElementById('search-input').value = '';
        document.querySelectorAll('.date-preset').forEach(b => b.classList.remove('active'));
        document.querySelector('.date-preset[data-days="30"]').classList.add('active');
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';

        document.querySelectorAll('#route-type-filters input, #status-filters input, #transport-type-filters input')
            .forEach(cb => cb.checked = true);

        document.getElementById('cost-min').value = 0;
        document.getElementById('cost-max').value = 10000;
        document.getElementById('cost-min-display').textContent = '\u20AC0';
        document.getElementById('cost-max-display').textContent = '\u20AC10,000';

        applyFilters();
        showToast('Filters reset to defaults', 'info');
    };

    // --- Export handlers ---
    const handleExport = () => {
        try {
            const filterDesc = getFilterDescription();
            const filename = ExportUtils.exportToExcel(filteredData, currentKPIs, filterDesc);
            showToast(`Exported: ${filename}`, 'success');
        } catch (err) {
            showToast('Export failed. Please try again.', 'error');
        }
    };

    const handleTableExport = () => {
        try {
            const filename = ExportUtils.exportTableToExcel(filteredData);
            showToast(`Exported: ${filename}`, 'success');
        } catch (err) {
            showToast('Export failed. Please try again.', 'error');
        }
    };

    const getFilterDescription = () => {
        if (filters.dateFrom && filters.dateTo) {
            return `${filters.dateFrom} to ${filters.dateTo}`;
        }
        return `Last ${filters.dateRange} days`;
    };

    // --- Dark Mode ---
    const toggleDarkMode = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('darkMode', 'false');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        }
        // Re-render charts for theme
        updateCharts();
        updateSparklines();
    };

    // --- Keyboard Shortcuts ---
    const setupKeyboardShortcuts = () => {
        document.addEventListener('keydown', (e) => {
            // Ctrl+E: Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                handleExport();
            }
            // Ctrl+F: Focus search
            if (e.ctrlKey && e.key === 'f' && !e.shiftKey) {
                // Only if not in an input
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    document.getElementById('search-input').focus();
                }
            }
            // Escape: Close sidebar
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });
    };

    // --- Save/Load filter state ---
    const saveFilterState = () => {
        try {
            localStorage.setItem('transportDashboard_filters', JSON.stringify(filters));
        } catch (e) {
            // Storage unavailable
        }
    };

    const loadFilterState = () => {
        try {
            const saved = localStorage.getItem('transportDashboard_filters');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(filters, parsed);
                restoreFilterUI();
                applyFilters(false);
            }
        } catch (e) {
            // Ignore parse errors
        }
    };

    const restoreFilterUI = () => {
        document.getElementById('search-input').value = filters.search || '';

        // Date presets
        document.querySelectorAll('.date-preset').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.days) === filters.dateRange && !filters.dateFrom);
        });

        if (filters.dateFrom) document.getElementById('date-from').value = filters.dateFrom;
        if (filters.dateTo) document.getElementById('date-to').value = filters.dateTo;

        // Checkboxes
        document.querySelectorAll('#route-type-filters input').forEach(cb => {
            cb.checked = filters.routeTypes.includes(cb.value);
        });
        document.querySelectorAll('#status-filters input').forEach(cb => {
            cb.checked = filters.statuses.includes(cb.value);
        });
        document.querySelectorAll('#transport-type-filters input').forEach(cb => {
            cb.checked = filters.transportTypes.includes(cb.value);
        });

        // Cost sliders
        document.getElementById('cost-min').value = filters.costMin;
        document.getElementById('cost-max').value = filters.costMax;
        document.getElementById('cost-min-display').textContent = '\u20AC' + formatNumber(filters.costMin);
        document.getElementById('cost-max-display').textContent = '\u20AC' + formatNumber(filters.costMax);
    };

    // --- Start on DOM ready ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { applyFilters, showToast };
})();
