// Set up dimensions
const width = 800;
const height = 800;
const outerRadius = Math.min(width, height) * 0.5 - 120;
const innerRadius = outerRadius - 30;

// Create SVG
const svg = d3.select("#chord-diagram")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chord-tooltip");

// Define the factors we want to analyze
const factors = [
    "Engine Size(L)",
    "Vehicle Class",
    "Fuel Type",
    "Fuel Consumption City (L/100 km)",
    "Fuel Consumption Hwy (L/100 km)",
    "CO2 Emissions(g/km)"
];

// Load and process the CSV data
d3.csv("CO2 Emissions_DS4200.csv").then(function(data) {
    // Calculate relationships between factors
    function calculateRelationshipStrength(data, factor1, factor2) {
        if (factor1 === factor2) return 0;

        // For numerical values
        if (!isNaN(data[0][factor1]) && !isNaN(data[0][factor2])) {
            // Calculate correlation coefficient
            const values1 = data.map(d => +d[factor1]);
            const values2 = data.map(d => +d[factor2]);
            
            const mean1 = d3.mean(values1);
            const mean2 = d3.mean(values2);
            
            const covariance = d3.sum(values1.map((v1, i) => 
                (v1 - mean1) * (values2[i] - mean2)
            )) / values1.length;
            
            const std1 = Math.sqrt(d3.sum(values1.map(v => Math.pow(v - mean1, 2))) / values1.length);
            const std2 = Math.sqrt(d3.sum(values2.map(v => Math.pow(v - mean2, 2))) / values2.length);
            
            const correlation = covariance / (std1 * std2);
            return Math.abs(correlation) * 100;
        }
        
        // For categorical values
        else {
            // Calculate Cramer's V
            const contingencyTable = d3.rollup(data,
                v => v.length,
                d => d[factor1],
                d => d[factor2]
            );
            
            const n = data.length;
            const rows = Array.from(contingencyTable.keys()).length;
            const cols = Array.from(contingencyTable.values())[0].size;
            
            const chi2 = calculateChi2(contingencyTable, n);
            const cramersV = Math.sqrt(chi2 / (n * Math.min(rows - 1, cols - 1)));
            return cramersV * 100;
        }
    }

    function calculateChi2(contingencyTable, n) {
        let chi2 = 0;
        const rowSums = new Map();
        const colSums = new Map();
        
        // Calculate row and column sums
        for (const [row, cols] of contingencyTable) {
            rowSums.set(row, Array.from(cols.values()).reduce((a, b) => a + b, 0));
            for (const [col, value] of cols) {
                colSums.set(col, (colSums.get(col) || 0) + value);
            }
        }
        
        // Calculate chi-square
        for (const [row, cols] of contingencyTable) {
            for (const [col, observed] of cols) {
                const expected = (rowSums.get(row) * colSums.get(col)) / n;
                chi2 += Math.pow(observed - expected, 2) / expected;
            }
        }
        
        return chi2;
    }

    // Create relationship matrix
    const matrix = [];
    for (let i = 0; i < factors.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < factors.length; j++) {
            matrix[i][j] = calculateRelationshipStrength(data, factors[i], factors[j]);
        }
    }

    // Color scale using a custom palette
    const color = d3.scaleOrdinal()
    .domain(factors)
    .range([
        '#e41a1c', // Strong red
        '#377eb8', // Blue
        '#4daf4a', // Green
        '#984ea3', // Purple
        '#ff7f00', // Orange
        '#a65628'  // Brown
    ]);

    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

    const chords = chord(matrix);

    // Add groups
    const group = svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

    // Add arcs
    group.append("path")
        .attr("class", "group-arc")
        .attr("d", d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius))
        .attr("fill", d => color(factors[d.index]))
        .style("stroke", "#fff")
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 0.8);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${factors[d.index]}</strong><br>
                Impact on CO2 Emissions: ${matrix[d.index][5].toFixed(1)}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 1);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add labels
    group.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", d => `
            rotate(${(d.angle * 180 / Math.PI - 90)})
            translate(${outerRadius + 10})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
        .text(d => factors[d.index])
        .style("font-size", "14px")
        .style("font-family", "Arial")
        .style("fill", d => color(factors[d.index]));

    // Add chords
    svg.append("g")
        .attr("fill-opacity", 0.67)
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("class", "chord")
        .attr("d", d3.ribbon()
            .radius(innerRadius))
        .attr("fill", d => color(factors[d.source.index]))
        .style("mix-blend-mode", "multiply")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .style("opacity", 1);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>Relationship Strength:</strong><br>
                ${factors[d.source.index]} → ${factors[d.target.index]}<br>
                Impact: ${matrix[d.source.index][d.target.index].toFixed(1)}%
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("opacity", 0.67);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}).catch(function(error) {
    console.log("Error loading the CSV file:", error);
});