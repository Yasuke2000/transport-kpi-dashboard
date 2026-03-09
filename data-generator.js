/* ============================================
   Transport Data Generator
   Generates realistic sample transport/logistics data
   ============================================ */

const TransportDataGenerator = (() => {

    // --- Seed-based random for reproducible data ---
    let _seed = 42;
    const seededRandom = () => {
        _seed = (_seed * 16807 + 0) % 2147483647;
        return (_seed - 1) / 2147483646;
    };

    const randomInt = (min, max) => Math.floor(seededRandom() * (max - min + 1)) + min;
    const randomFloat = (min, max) => seededRandom() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(seededRandom() * arr.length)];
    const weightedPick = (items, weights) => {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = seededRandom() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    };

    // --- Reference Data ---
    const CITIES = {
        uk: ['Dover', 'Felixstowe', 'Southampton', 'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool'],
        ireland: ['Dublin', 'Cork', 'Rosslare', 'Belfast', 'Limerick'],
        eu: ['Zeebrugge', 'Rotterdam', 'Antwerp', 'Calais', 'Dunkirk', 'Hamburg', 'Amsterdam', 'Le Havre', 'Paris', 'Brussels', 'Frankfurt', 'Duisburg']
    };

    const ROUTES = [
        { origin: 'Dover', destination: 'Calais', type: 'UK-EU', distance: 55, baseTime: 90 },
        { origin: 'Dover', destination: 'Dunkirk', type: 'UK-EU', distance: 68, baseTime: 120 },
        { origin: 'Felixstowe', destination: 'Rotterdam', type: 'UK-EU', distance: 192, baseTime: 420 },
        { origin: 'Felixstowe', destination: 'Antwerp', type: 'UK-EU', distance: 175, baseTime: 360 },
        { origin: 'Southampton', destination: 'Le Havre', type: 'UK-EU', distance: 185, baseTime: 390 },
        { origin: 'London', destination: 'Brussels', type: 'UK-EU', distance: 370, baseTime: 480 },
        { origin: 'London', destination: 'Paris', type: 'UK-EU', distance: 460, baseTime: 540 },
        { origin: 'Birmingham', destination: 'Rotterdam', type: 'UK-EU', distance: 520, baseTime: 660 },
        { origin: 'Manchester', destination: 'Zeebrugge', type: 'UK-EU', distance: 580, baseTime: 720 },
        { origin: 'Liverpool', destination: 'Dublin', type: 'UK-EU', distance: 220, baseTime: 480 },
        { origin: 'Dublin', destination: 'Zeebrugge', type: 'Ireland-EU', distance: 880, baseTime: 1080 },
        { origin: 'Dublin', destination: 'Rotterdam', type: 'Ireland-EU', distance: 930, baseTime: 1140 },
        { origin: 'Dublin', destination: 'Antwerp', type: 'Ireland-EU', distance: 860, baseTime: 1020 },
        { origin: 'Cork', destination: 'Le Havre', type: 'Ireland-EU', distance: 640, baseTime: 840 },
        { origin: 'Rosslare', destination: 'Dunkirk', type: 'Ireland-EU', distance: 740, baseTime: 960 },
        { origin: 'Rotterdam', destination: 'Antwerp', type: 'Intra-EU', distance: 100, baseTime: 120 },
        { origin: 'Rotterdam', destination: 'Hamburg', type: 'Intra-EU', distance: 460, baseTime: 330 },
        { origin: 'Antwerp', destination: 'Paris', type: 'Intra-EU', distance: 310, baseTime: 240 },
        { origin: 'Zeebrugge', destination: 'Amsterdam', type: 'Intra-EU', distance: 245, baseTime: 200 },
        { origin: 'Brussels', destination: 'Frankfurt', type: 'Intra-EU', distance: 400, baseTime: 300 },
        { origin: 'Calais', destination: 'Brussels', type: 'Intra-EU', distance: 270, baseTime: 210 },
        { origin: 'Hamburg', destination: 'Duisburg', type: 'Intra-EU', distance: 395, baseTime: 290 },
        { origin: 'Paris', destination: 'Frankfurt', type: 'Intra-EU', distance: 590, baseTime: 420 },
        { origin: 'Le Havre', destination: 'Rotterdam', type: 'Intra-EU', distance: 620, baseTime: 460 },
        { origin: 'Amsterdam', destination: 'Duisburg', type: 'Intra-EU', distance: 230, baseTime: 180 }
    ];

    const CUSTOMERS = [
        'NorthStar Logistics', 'EuroFreight Solutions', 'Atlantic Cargo Ltd',
        'Continental Transport BV', 'Maritime Express', 'Celtic Shipping Co',
        'TransEuropa GmbH', 'Channel Freight Services', 'Nordic Haulage AS',
        'Benelux Distribution', 'Irish Sea Freight', 'Hanseatic Logistics',
        'Albion Transport', 'Bruges Forwarding', 'Rhine Valley Carriers',
        'Cross-Channel Cargo', 'Euro-Atlantic Freight', 'Meridian Haulage',
        'TideWater Logistics', 'Highland Express', 'Port City Transport',
        'Oceanic Carriers', 'FlandersLink NV', 'DoverStar Freight',
        'SeaBridge Logistics', 'PanEurope Cargo', 'Emerald Isle Shipping',
        'ChannelBridge Transport', 'Continental Connect', 'EastPort Forwarding'
    ];

    const TRANSPORT_TYPES = ['Road', 'Ferry', 'Rail', 'Multimodal'];
    const TRANSPORT_WEIGHTS_BY_ROUTE = {
        'UK-EU': [0.25, 0.40, 0.15, 0.20],
        'Ireland-EU': [0.15, 0.55, 0.05, 0.25],
        'Intra-EU': [0.55, 0.05, 0.25, 0.15]
    };

    const STATUS_OPTIONS = ['Delivered', 'In Transit', 'Delayed', 'Cancelled'];
    const STATUS_WEIGHTS = [0.80, 0.12, 0.06, 0.02];

    // --- Cost calculation ---
    const calculateCost = (distance, transportType, routeType) => {
        const baseCostPerKm = {
            'Road': 1.2,
            'Ferry': 2.5,
            'Rail': 0.9,
            'Multimodal': 1.8
        };
        const routeSurcharge = {
            'UK-EU': 1.25,       // Brexit surcharge
            'Ireland-EU': 1.15,
            'Intra-EU': 1.0
        };
        const base = distance * baseCostPerKm[transportType] * routeSurcharge[routeType];
        const variation = randomFloat(0.85, 1.15);
        return Math.round(base * variation * 100) / 100;
    };

    // --- Delay calculation (UK-EU routes have more delays) ---
    const calculateDelay = (status, routeType) => {
        if (status === 'Delivered') {
            // 75% on time, 25% minor delay
            if (seededRandom() < 0.75) return 0;
            return randomInt(5, 30);
        }
        if (status === 'In Transit') {
            return 0; // No delay yet measurable
        }
        if (status === 'Delayed') {
            const baseDelay = routeType === 'UK-EU'
                ? randomInt(30, 480)
                : routeType === 'Ireland-EU'
                    ? randomInt(20, 360)
                    : randomInt(15, 240);
            return baseDelay;
        }
        return 0; // Cancelled
    };

    // --- Generate departure times with realistic patterns ---
    const generateDepartureTime = (date) => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Weight toward peak hours: 6-9 AM, 2-5 PM
        let hour;
        if (isWeekend) {
            hour = randomInt(7, 18);
        } else {
            const period = seededRandom();
            if (period < 0.35) {
                hour = randomInt(6, 9);   // Morning peak
            } else if (period < 0.55) {
                hour = randomInt(10, 13);  // Midday
            } else if (period < 0.85) {
                hour = randomInt(14, 17);  // Afternoon peak
            } else {
                hour = randomInt(18, 23);  // Evening
            }
        }
        const minute = randomInt(0, 59);
        const result = new Date(date);
        result.setHours(hour, minute, 0, 0);
        return result;
    };

    // --- Main generation function ---
    const generate = (count = 750, daysBack = 90) => {
        _seed = 42; // Reset seed for reproducibility
        const records = [];
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysBack);

        for (let i = 0; i < count; i++) {
            // Determine date with weekend reduction
            let date;
            let attempts = 0;
            do {
                date = new Date(startDate.getTime() + seededRandom() * (now.getTime() - startDate.getTime()));
                attempts++;
                // Reduce weekend volume by 40%
                if ((date.getDay() === 0 || date.getDay() === 6) && seededRandom() < 0.4) {
                    continue;
                }
                break;
            } while (attempts < 5);

            const route = pick(ROUTES);
            const routeType = route.type;
            const transportType = weightedPick(TRANSPORT_TYPES, TRANSPORT_WEIGHTS_BY_ROUTE[routeType]);

            // Status with adjustment: recent records more likely "In Transit"
            const daysAgo = (now - date) / (1000 * 60 * 60 * 24);
            let status;
            if (daysAgo < 2) {
                status = weightedPick(STATUS_OPTIONS, [0.30, 0.55, 0.10, 0.05]);
            } else {
                status = weightedPick(STATUS_OPTIONS, STATUS_WEIGHTS);
            }

            const departure = generateDepartureTime(date);
            const travelMinutes = route.baseTime + randomInt(-30, 60);
            const scheduledArrival = new Date(departure.getTime() + travelMinutes * 60000);
            const delayMinutes = calculateDelay(status, routeType);
            const actualArrival = status === 'Cancelled'
                ? null
                : status === 'In Transit'
                    ? null
                    : new Date(scheduledArrival.getTime() + delayMinutes * 60000);

            const cost = calculateCost(route.distance, transportType, routeType);
            const orderId = `TR-2024-${String(10000 + i).padStart(5, '0')}`;

            records.push({
                orderId,
                origin: route.origin,
                destination: route.destination,
                route: `${route.origin} → ${route.destination}`,
                routeType,
                departure: departure.toISOString(),
                scheduledArrival: scheduledArrival.toISOString(),
                actualArrival: actualArrival ? actualArrival.toISOString() : null,
                status,
                delayMinutes,
                cost,
                distance: route.distance + randomInt(-20, 20),
                transportType,
                customer: pick(CUSTOMERS),
                travelTimeMinutes: travelMinutes
            });
        }

        // Sort by departure date
        records.sort((a, b) => new Date(a.departure) - new Date(b.departure));
        return records;
    };

    // --- Calculate KPIs from data ---
    const calculateKPIs = (data, previousData = null) => {
        const totalShipments = data.length;
        const delivered = data.filter(d => d.status === 'Delivered');
        const delayed = data.filter(d => d.status === 'Delayed');
        const onTimeDelivered = delivered.filter(d => d.delayMinutes <= 15);
        const onTimePercent = delivered.length > 0
            ? (onTimeDelivered.length / delivered.length) * 100
            : 0;

        const allDelays = data.filter(d => d.delayMinutes > 0);
        const avgDelay = allDelays.length > 0
            ? allDelays.reduce((sum, d) => sum + d.delayMinutes, 0) / allDelays.length
            : 0;

        const totalRevenue = data.reduce((sum, d) => sum + d.cost, 0);
        const avgCost = totalShipments > 0 ? totalRevenue / totalShipments : 0;

        const uniqueRoutes = new Set(data.map(d => d.route));

        const kpis = {
            totalShipments,
            onTimePercent: Math.round(onTimePercent * 10) / 10,
            avgDelay: Math.round(avgDelay),
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgCost: Math.round(avgCost * 100) / 100,
            activeRoutes: uniqueRoutes.size,
            deliveredCount: delivered.length,
            delayedCount: delayed.length,
            inTransitCount: data.filter(d => d.status === 'In Transit').length,
            cancelledCount: data.filter(d => d.status === 'Cancelled').length
        };

        // Calculate trends vs previous period
        if (previousData && previousData.length > 0) {
            const prevKPIs = calculateKPIs(previousData);
            kpis.trends = {
                totalShipments: calculateTrend(kpis.totalShipments, prevKPIs.totalShipments),
                onTimePercent: calculateTrend(kpis.onTimePercent, prevKPIs.onTimePercent),
                avgDelay: calculateTrend(kpis.avgDelay, prevKPIs.avgDelay, true), // inverted: lower is better
                totalRevenue: calculateTrend(kpis.totalRevenue, prevKPIs.totalRevenue),
                avgCost: calculateTrend(kpis.avgCost, prevKPIs.avgCost, true),
                activeRoutes: calculateTrend(kpis.activeRoutes, prevKPIs.activeRoutes)
            };
        }

        return kpis;
    };

    const calculateTrend = (current, previous, inverted = false) => {
        if (previous === 0) return { value: 0, direction: 'neutral' };
        const change = ((current - previous) / previous) * 100;
        const rounded = Math.round(change * 10) / 10;
        let direction;
        if (Math.abs(rounded) < 0.5) {
            direction = 'neutral';
        } else if (inverted) {
            direction = rounded > 0 ? 'down' : 'up';
        } else {
            direction = rounded > 0 ? 'up' : 'down';
        }
        return { value: rounded, direction };
    };

    // --- Aggregation helpers for charts ---
    const aggregateByDay = (data, field = 'departure') => {
        const grouped = {};
        data.forEach(record => {
            const d = new Date(record[field]);
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(record);
        });
        return grouped;
    };

    const aggregateByRoute = (data) => {
        const grouped = {};
        data.forEach(record => {
            const key = record.routeType;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(record);
        });
        return grouped;
    };

    const aggregateByTransportType = (data) => {
        const grouped = {};
        data.forEach(record => {
            const key = record.transportType;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(record);
        });
        return grouped;
    };

    const getDelayDistribution = (data) => {
        const buckets = {
            '0-15 min': 0,
            '15-30 min': 0,
            '30-60 min': 0,
            '60-120 min': 0,
            '120+ min': 0
        };
        data.forEach(record => {
            const delay = record.delayMinutes;
            if (delay <= 15) buckets['0-15 min']++;
            else if (delay <= 30) buckets['15-30 min']++;
            else if (delay <= 60) buckets['30-60 min']++;
            else if (delay <= 120) buckets['60-120 min']++;
            else buckets['120+ min']++;
        });
        return buckets;
    };

    const getTopRoutes = (data, limit = 10) => {
        const counts = {};
        data.forEach(record => {
            counts[record.route] = (counts[record.route] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([route, count]) => ({
                route,
                count,
                percentage: Math.round((count / data.length) * 1000) / 10
            }));
    };

    // --- Get sparkline data (daily counts for last N days) ---
    const getSparklineData = (data, days = 14, metric = 'count') => {
        const now = new Date();
        const points = [];
        for (let i = days - 1; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const dayData = data.filter(d => {
                const dep = new Date(d.departure);
                return dep >= dayStart && dep <= dayEnd;
            });
            if (metric === 'count') {
                points.push(dayData.length);
            } else if (metric === 'revenue') {
                points.push(dayData.reduce((s, d) => s + d.cost, 0));
            } else if (metric === 'delay') {
                const delays = dayData.filter(d => d.delayMinutes > 0);
                points.push(delays.length > 0
                    ? delays.reduce((s, d) => s + d.delayMinutes, 0) / delays.length
                    : 0);
            } else if (metric === 'ontime') {
                const del = dayData.filter(d => d.status === 'Delivered');
                const onTime = del.filter(d => d.delayMinutes <= 15);
                points.push(del.length > 0 ? (onTime.length / del.length) * 100 : 100);
            } else if (metric === 'avgcost') {
                points.push(dayData.length > 0
                    ? dayData.reduce((s, d) => s + d.cost, 0) / dayData.length
                    : 0);
            } else if (metric === 'routes') {
                points.push(new Set(dayData.map(d => d.route)).size);
            }
        }
        return points;
    };

    // --- Split data into current and previous periods ---
    const splitPeriods = (data, days) => {
        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - days);
        const prevStart = new Date(periodStart);
        prevStart.setDate(prevStart.getDate() - days);

        const current = data.filter(d => new Date(d.departure) >= periodStart);
        const previous = data.filter(d => {
            const dep = new Date(d.departure);
            return dep >= prevStart && dep < periodStart;
        });

        return { current, previous };
    };

    return {
        generate,
        calculateKPIs,
        aggregateByDay,
        aggregateByRoute,
        aggregateByTransportType,
        getDelayDistribution,
        getTopRoutes,
        getSparklineData,
        splitPeriods
    };
})();
