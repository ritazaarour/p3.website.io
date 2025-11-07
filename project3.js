let xScale, yScale;
let chartG;         
let chartWidth, chartHeight;
let currentData, currentYear;

// Load JSON data
async function loadData() {
    const response = await fetch('Surface_Temp_Change_reduced.json');
    const data = await response.json();
    return data;
}

// Filter data for South America
function filterRegions(data) {
    return data.filter(
        d => d.Continent === 'South America' && d.Country !== 'Falkland Islands (Malvinas)'
    );
}

// Scroll for years
function getYearRange(data) {
    const years = [...new Set(data.map(d => +d.Year))];
    return {
        values: years,
        min: d3.min(years),
        max: d3.max(years)
    };
}

// Tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip");

// Setup UI
function setupUI(yearRange, americasData) {
    const app = d3.select("#app");

    app.append("h2").text("Surface Temperature Change in South America");

    const controls = app.append("div").attr("id", "controls");

    controls.append("label").attr("for", "yearSlider").text("Year: ");

    controls.append("input")
        .attr("id", "yearSlider")
        .attr("type", "range")
        .attr("min", yearRange.min)
        .attr("max", yearRange.max)
        .attr("step", 1)
        .attr("value", yearRange.min);

    controls.append("span").attr("id","yearLabel").text(yearRange.min);

    // Legend
    const legend = app.append("div").attr("class", "legend");

    legend.append("span").attr("class", "legend-warming").html("■ Warming");
    legend.append("span").attr("class", "legend-cooling").html("■ Cooling");

    // Stats panel
    const stats = app.append("div").attr("id", "stats");

    const avgStat = stats.append("div").attr("class", "stat-item");
    avgStat.append("div").attr("class", "stat-value").attr("id", "avgTemp").text("+0.00°C");
    avgStat.append("div").attr("class", "stat-label").text("Average Change");

    const maxStat = stats.append("div").attr("class", "stat-item");
    maxStat.append("div").attr("class", "stat-value warming").attr("id", "maxTemp").text("+0.00°C");
    maxStat.append("div").attr("class", "stat-label").text("Highest Warming");

    const countStat = stats.append("div").attr("class", "stat-item");
    countStat.append("div").attr("class", "stat-value").attr("id", "warmingCount").text("0");
    countStat.append("div").attr("class", "stat-label").text("Countries Warming");

    // Year slider event
    d3.select("#yearSlider").on("input", function() {
        const year = +this.value;
        d3.select("#yearLabel").text(year);
        update(americasData, year);
    });
}

// Chart setup
function setupChart(data) {
    const margin = {top: 50, right: 80, bottom: 50, left: 250};
    const width = 950;
    const height = 800;

    chartWidth = width - margin.left - margin.right;
    chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#app")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
        
    chartG = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const extent = d3.extent(data, d => d.Value);
    const padding = (extent[1] - extent[0]) * 0.1;
    
    xScale = d3.scaleLinear()
        .domain([extent[0] - padding, extent[1] + padding])
        .range([0, chartWidth]);

    yScale = d3.scaleBand()
        .padding(0.2)
        .range([0, chartHeight]);

    // Axes
    chartG.append("g").attr("class", "y-axis");
    chartG.append("g").attr("class", "x-axis");

    chartG.append("text")
        .attr("class", "x-axis-label")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .text("Temperature Change (°C)");

    // adding brushing
    const brush = d3.brushY()
        .extent([[0, 0], [chartWidth, chartHeight]])
        .on("brush end", brushed);

    chartG.append("g")
        .attr("class", "brush")
        .call(brush);
}

// Wrap y-axis text
function wrapText(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word, line = [], lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy") || 0);
        let tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", -10).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Update chart
function update(data, year) {
    currentData = data;
    currentYear = year;

    const yearData = data.filter(d => +d.Year === year);
    yearData.sort((a,b) => d3.descending(a.Value, b.Value));

    // Stats
    updateStats(yearData);

    yScale.domain(yearData.map(d => d.Country));

    const bars = chartG.selectAll("rect").data(yearData, d => d.Country);

    const barsEnter = bars.enter().append("rect")
        .attr("rx", 2)
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                   .html(`<strong>${d.Country}</strong><br/>Temperature Change: ${d.Value > 0 ? '+' : ''}${d.Value.toFixed(2)}°C<br/>Year: ${year}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 25) + "px");
            d3.select(this).style("opacity", 0.7);
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });

    barsEnter.merge(bars)
        .transition().duration(300)
        .attr("y", d => yScale(d.Country))
        .attr("height", yScale.bandwidth())
        .attr("x", d => Math.min(xScale(0), xScale(d.Value)))
        .attr("width", d => Math.abs(xScale(d.Value) - xScale(0)))
        .attr("fill", d => d.Value >= 0 ? "#d73027" : "#4575b4")
        .attr("opacity", 1);

    bars.exit().remove();

    const labels = chartG.selectAll(".value-label").data(yearData, d => d.Country);
    labels.enter().append("text")
        .attr("class", "value-label")
        .merge(labels)
        .transition().duration(300)
        .attr("x", d => xScale(d.Value) + (d.Value >= 0 ? 5 : -5))
        .attr("y", d => yScale(d.Country) + yScale.bandwidth()/2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.Value >= 0 ? "start" : "end")
        .text(d => `${d.Value > 0 ? '+' : ''}${d.Value.toFixed(2)}°C`);
    labels.exit().remove();

    chartG.select(".y-axis").transition().duration(300).call(d3.axisLeft(yScale)).selectAll(".tick text").call(wrapText, 240);
    chartG.select(".x-axis").transition().duration(300).call(d3.axisTop(xScale).ticks(8));

    chartG.selectAll(".zero-line").remove();
    chartG.append("line")
        .attr("class", "zero-line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", "#000")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
}

// updates stats for brushed data
function updateStats(dataSubset) {
    const avgTemp = d3.mean(dataSubset, d => d.Value) || 0;
    const maxTemp = d3.max(dataSubset, d => d.Value) || 0;
    const warmingCount = dataSubset.filter(d => d.Value > 0).length;

    d3.select("#avgTemp")
        .text(`${avgTemp >= 0 ? '+' : ''}${avgTemp.toFixed(2)}°C`)
        .attr("class", `stat-value ${avgTemp >= 0 ? 'warming' : 'cooling'}`);

    d3.select("#maxTemp")
        .text(`${maxTemp >= 0 ? '+' : ''}${maxTemp.toFixed(2)}°C`)
        .attr("class", "stat-value warming");

    d3.select("#warmingCount")
        .text(warmingCount);
}

function brushed(event) {
    const selection = event.selection;
    const yearData = currentData.filter(d => +d.Year === currentYear);

    if (!selection) {
        chartG.selectAll("rect").attr("opacity", 1);
        updateStats(yearData);
        return;
    }

    const [y0, y1] = selection;

    // which bars are inside the brushed region
    const brushedBars = yearData.filter(d => {
        const yPos = yScale(d.Country) + yScale.bandwidth() / 2;
        return y0 <= yPos && yPos <= y1;
    });

    // highlight brushed bars
    chartG.selectAll("rect")
        .attr("opacity", d =>
            brushedBars.find(b => b.Country === d.Country) ? 1 : 0.3
        );

    updateStats(brushedBars);
}

// Load data and initialize
loadData().then(rawData => {
    const americas = filterRegions(rawData);
    const yearRange = getYearRange(americas);

    setupUI(yearRange, americas);
    setupChart(americas);
    update(americas, yearRange.min);
});