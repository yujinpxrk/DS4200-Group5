const width = 600;
const height = 600;
const innerRadius = Math.min(width, height) * 0.35;
const outerRadius = innerRadius * 1.1;

// Create the SVG container
const svg = d3.select("#chord-diagram")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `-${width/2} -${height/2} ${width} ${height}`)
    .append("g");

// Create tooltip div
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chord-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("padding", "8px")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
    .style("z-index", "1000");

// Hardcoded matrix data for better visualization
const matrix = [
    [0, 11975, 8916, 2868, 1000],    // Engine Size
    [11975, 0, 16145, 6171, 1500],   // CO2 Emissions
    [8916, 16145, 0, 8045, 2000],    // Fuel Consumption Hwy
    [2868, 6171, 8045, 0, 1000],     // Vehicle Class
    [1000, 1500, 2000, 1000, 0]      // Fuel Type
];

const names = [
    "Engine Size(L)",
    "CO2 Emissions(g/km)",
    "Fuel Consumption Hwy (L/100 km)",
    "Vehicle Class",
    "Fuel Type"
];

const colors = [
    "#ff4d4d",  // Red for Engine Size
    "#4d94ff",  // Blue for CO2 Emissions
    "#ff9933",  // Orange for Fuel Consumption
    "#9933ff",  // Purple for Vehicle Class
    "#33cc33"   // Green for Fuel Type
];

// Create the chord layout
const chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

const chords = chord(matrix);

// Create the arc generator
const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

// Create the ribbon generator
const ribbon = d3.ribbon()
    .radius(innerRadius);

// Add the groups
const group = svg.append("g")
    .selectAll("g")
    .data(chords.groups)
    .join("g");

// Add the arcs
group.append("path")
    .attr("class", "group-arc")
    .attr("d", arc)
    .style("fill", d => colors[d.index])
    .style("stroke", "white")
    .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1)
            .html(names[d.index])
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("opacity", 0);
    });

// Add the group labels
group.append("text")
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr("dy", ".35em")
    .attr("transform", d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerRadius + 10})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
    `)
    .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
    .text(d => names[d.index])
    .style("font-size", "12px")
    .style("fill", d => colors[d.index]);

// Add the ribbons
svg.append("g")
    .attr("class", "ribbons")
    .selectAll("path")
    .data(chords)
    .join("path")
    .attr("d", ribbon)
    .style("fill", d => colors[d.source.index])
    .style("opacity", 0.7)
    .style("stroke", "none")
    .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1)
            .html(`${names[d.source.index]} → ${names[d.target.index]}<br/>Value: ${d.source.value}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("opacity", 0);
    });

// Add title
svg.append("text")
    .attr("x", 0)
    .attr("y", -height/2 + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("CO2 Emissions Relationship Network");