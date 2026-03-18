# Transport KPI Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with Chart.js](https://img.shields.io/badge/Charts-Chart.js%204-FF6384.svg)](https://www.chartjs.org/)
[![No Framework](https://img.shields.io/badge/Framework-None-green.svg)](#tech-stack)

A professional, real-time Transport & Logistics KPI Dashboard built with pure HTML, CSS, and JavaScript. Monitors shipment performance, delivery metrics, cost analysis, and route efficiency across European transport networks.

![Dashboard Preview](https://via.placeholder.com/1200x600/2563EB/FFFFFF?text=Transport+KPI+Dashboard)

---

## Features

- **6 Key Performance Indicators** with animated counters, trend comparisons, and sparkline charts
- **5 Interactive Charts** - Volume over time, delivery performance, cost breakdown, delay distribution, and top routes
- **Advanced Filtering** - Date range, route type, status, transport mode, cost range, and search
- **Sortable Data Table** with pagination and status badges
- **Excel Export** - Full report with Summary, Shipments, and Charts Data sheets
- **Dark Mode** toggle with persistent preference
- **Responsive Design** - Desktop, tablet, and mobile optimized
- **Keyboard Shortcuts** - Ctrl+E (export), Ctrl+F (search), Escape (close sidebar)
- **Print-Friendly** CSS for clean printed reports
- **LocalStorage Persistence** - Filters saved between sessions

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Semantic structure with accessibility (ARIA) |
| CSS3 | Grid, Flexbox, Custom Properties, animations |
| JavaScript (ES6+) | Modular application logic, no frameworks |
| [Chart.js 4.x](https://www.chartjs.org/) | Interactive data visualizations |
| [SheetJS (xlsx)](https://sheetjs.com/) | Excel file generation and export |

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/daviddelporte/transport-kpi-dashboard.git
   cd transport-kpi-dashboard
   ```

2. **Open in browser:**
   Simply open `index.html` in any modern web browser. No build tools, no npm install, no server needed.

   ```bash
   # Or use a simple local server:
   npx serve .
   # Or with Python:
   python -m http.server 8000
   ```

3. **That's it!** The dashboard generates realistic sample data on load.

## Usage

### Navigating the Dashboard
- **KPI Cards** (top) show key metrics with trend indicators
- **Charts** (middle) provide visual analysis - hover for details
- **Data Table** (bottom) shows individual shipment records

### Filtering Data
1. Use the **left sidebar** to set filters
2. Select date ranges, route types, statuses, and transport modes
3. Adjust the cost slider to filter by shipment cost
4. Click **Apply Filters** to update all views
5. Click **Reset Filters** to return to defaults

### Exporting Data
- Click **Export to Excel** in the header for a full report
- Click **Export Table** above the data table for shipment data only
- Use **Ctrl+E** as a keyboard shortcut

### Chart Interactions
- **Volume Chart**: Toggle between 30/60/90 day views
- **All Charts**: Hover for detailed tooltips
- Charts update automatically when filters are applied

## Project Structure

```
transport-kpi-dashboard/
├── index.html           # Main dashboard page
├── styles.css           # All styles (responsive, dark mode, print)
├── app.js               # Main application logic & state management
├── data-generator.js    # Realistic sample data generation
├── chart-utils.js       # Chart.js configurations & helpers
├── export-utils.js      # Excel/XLSX export functionality
├── README.md            # This file
└── sample-data/
    └── transport_data.json  # Data schema documentation
```

## Data Schema

Each shipment record contains:

| Field | Type | Example |
|-------|------|---------|
| `orderId` | String | `TR-2024-10042` |
| `origin` | String | `Dover` |
| `destination` | String | `Calais` |
| `routeType` | Enum | `UK-EU`, `Ireland-EU`, `Intra-EU` |
| `departure` | ISO DateTime | `2024-01-15T08:30:00.000Z` |
| `scheduledArrival` | ISO DateTime | `2024-01-15T10:00:00.000Z` |
| `actualArrival` | ISO DateTime | `2024-01-15T10:45:00.000Z` |
| `status` | Enum | `Delivered`, `In Transit`, `Delayed`, `Cancelled` |
| `delayMinutes` | Number | `45` |
| `cost` | Number (EUR) | `1,234.56` |
| `distance` | Number (km) | `192` |
| `transportType` | Enum | `Road`, `Ferry`, `Rail`, `Multimodal` |
| `customer` | String | `EuroFreight Solutions` |

### Data Realism

The generator produces realistic patterns:
- **80%** delivered, **12%** in transit, **6%** delayed, **2%** cancelled
- Peak departure hours: 06:00-09:00 and 14:00-17:00
- Reduced weekend volume (~40% less)
- Higher delays on UK-EU routes (simulating Brexit border impact)
- Cost calculated from distance, transport mode, and route surcharges

## Why This Project?

This dashboard was built as a portfolio piece demonstrating:

1. **Real-World Application** - Transport & logistics is a data-intensive industry where KPI dashboards are essential for operations management. This project mirrors dashboards used by freight companies, 3PLs, and port authorities across Europe.

2. **Data Visualization Skills** - From sparklines to stacked bar charts, the dashboard showcases effective use of Chart.js for conveying complex data clearly and intuitively.

3. **Domain Knowledge** - The KPIs tracked (on-time delivery, delay analysis, cost per shipment, route performance) are the exact metrics logistics managers monitor daily. The inclusion of UK-EU post-Brexit dynamics shows understanding of current industry challenges.

4. **Full-Stack Thinking** - While frontend-focused, the architecture (modular JS, data generation, export capabilities) demonstrates the ability to build complete, production-quality solutions.

5. **Digital Solutions Expertise** - Built without frameworks to show mastery of core web technologies, with professional UX patterns (responsive design, dark mode, keyboard shortcuts, toast notifications).

## Future Enhancements

- [ ] Backend API integration (Node.js/Express)
- [ ] Real-time data with WebSocket updates
- [ ] PDF export with charts (jsPDF)
- [ ] Map visualization with route tracking (Leaflet.js)
- [ ] User authentication and role-based access
- [ ] Custom date range comparison (Year-over-Year)
- [ ] Email/Slack alerts for KPI thresholds
- [ ] Multi-language support (EN/FR/NL/DE)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**David Delporte**
- GitHub: [@daviddelporte](https://github.com/daviddelporte)
- LinkedIn: [David Delporte](https://linkedin.com/in/daviddelporte)

---

*Built with care for the logistics industry. Data-driven decisions start with great dashboards.*
