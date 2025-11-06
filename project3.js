import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

d3.json("Surface_Temp_Change_reduced.json").then(rawData => {
  console.log("Data loaded:", rawData.length, "records");

  // convert year string to number
  rawData.forEach(d => {
    d.Year = +d.Year;
  });

  // group country by continent
  const grouped = d3.groups(rawData, d => d.Continent);
  const continents = grouped.map(([continent, values]) => ({
    continent,
    values: d3.rollups(
      values,
      v => d3.mean(v, d => d.Value),
      d => d.Year
    ).map(([Year, Value]) => ({ Year, Value }))
     .sort((a, b) => a.Year - b.Year)
  }));

  const allYears = Array.from(new Set(rawData.map(d => d.Year))).sort(d3.ascending);
  const allContinents = continents.map(c => c.continent);

  // chart
  const margin = { top: 40, right: 40, bottom: 50, left: 100 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([d3.min(rawData, d => d.Value), d3.max(rawData, d => d.Value)]) // fixed across all years
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(allContinents)
    .range([0, height])
    .padding(0.3);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(allContinents);

  // axes
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  const yAxis = svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Average Temperature by Continent");

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // slider
  let currentYear = allYears[0];
  const slider = d3.select("#slider")
    .append("input")
    .attr("type", "range")
    .attr("min", allYears[0])
    .attr("max", allYears[allYears.length - 1])
    .attr("value", currentYear)
    .attr("step", 1)
    .style("width", "500px")
    .on("input", function() {
      currentYear = +this.value;
      updateChart(currentYear);
    });

  const yearLabel = d3.select("#slider")
    .append("div")
    .style("margin-top", "8px")
    .style("font-weight", "bold")
    .text(`Year: ${currentYear}`);

  updateChart(currentYear);

  function updateChart(year) {
    yearLabel.text(`Year: ${year}`);

    const yearData = continents.map(c => {
      const entry = c.values.find(v => v.Year === year);
      return { continent: c.continent, Value: entry ? entry.Value : 0 };
    });

    // JOIN
    const bars = svg.selectAll(".bar").data(yearData, d => d.continent);

    bars.exit()
      .transition()
      .duration(500)
      .attr("width", 0)
      .remove();

    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d.continent))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("fill", d => color(d.continent))
      .merge(bars)
      .transition()
      .duration(800)
      .attr("width", d => x(d.Value))
      .attr("y", d => y(d.continent));

    svg.selectAll(".bar")
      .on("mouseover", (event, d) => {
        tooltip.transition().style("opacity", 1);
        tooltip.html(`<b>${d.continent}</b><br>${year}: ${d.Value.toFixed(2)}°C avg`)
          .style("left", event.pageX + 8 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => tooltip.transition().style("opacity", 0));
  }
});