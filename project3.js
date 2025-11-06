d3.json("Surface_Temp_Change_reduced.json").then(rawData => {
  console.log("Data loaded:", rawData.length, "records");

  // onvert year string to number
  rawData.forEach(d => {
    d.Year = +d.Year;
  });

  // group country by continent 
  const grouped = d3.groups(rawData, d => d.Continent);
  const continents = grouped.map(([continent, values]) => ({
    continent,
    values: d3.rollups(values,
      v => d3.mean(v, d => d.Value),
      d => d.Year
    ).map(([Year, Value]) => ({ Year, Value }))
     .sort((a, b) => a.Year - b.Year)
  }));

  // chart
  const margin = { top: 40, right: 100, bottom: 50, left: 60 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(rawData, d => d.Year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(rawData, d => d.Value))
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(continents.map(c => c.continent));

  // axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));

  // line
  const line = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d.Value));

  svg.selectAll(".continent-line")
    .data(continents)
    .enter()
    .append("path")
    .attr("class", "continent-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.continent))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values));

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // slider
  const yearExtent = d3.extent(rawData, d => d.Year);
  let currentYear = yearExtent[0];

  const slider = d3.select("#slider")
    .append("input")
    .attr("type", "range")
    .attr("min", yearExtent[0])
    .attr("max", yearExtent[1])
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

  function updateChart(year) {
    yearLabel.text(`Year: ${year}`);

    const filtered = continents.map(c => ({
      continent: c.continent,
      value: c.values.find(v => v.Year === year)
    })).filter(d => d.value);

    const points = svg.selectAll(".year-dot")
      .data(filtered, d => d.continent);

    points.exit().remove();

    points.enter()
      .append("circle")
      .attr("class", "year-dot")
      .merge(points)
      .attr("cx", d => x(d.value.Year))
      .attr("cy", d => y(d.value.Value))
      .attr("r", 5)
      .attr("fill", d => color(d.continent))
      .on("mouseover", (event, d) => {
        tooltip.transition().style("opacity", 1);
        tooltip.html(`<b>${d.continent}</b><br>${year}: ${d.value.Value.toFixed(2)}°C`)
          .style("left", event.pageX + 8 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => tooltip.transition().style("opacity", 0));
  }

  updateChart(currentYear);
});
