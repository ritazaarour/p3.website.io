d3.json("Surface_Temp_Change_reduced.json").then(data => {
  data.forEach(d => {
    d.Year = +d.Year;
    d.Value = +d.Value;
  });

  const continents = d3.groups(data, d => d.Continent)
    .map(([continent, values]) => ({
      continent,
      values: d3.rollups(
        values,
        v => d3.mean(v, d => d.Value),
        d => d.Year
      ).map(([Year, Value]) => ({ Year, Value }))
      .sort((a, b) => a.Year - b.Year)
    }));

  drawChart(continents);
});


function drawChart(continents) {
  const margin = { top: 50, right: 120, bottom: 40, left: 60 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const allYears = d3.extent(continents.flatMap(c => c.values.map(v => v.Year)));
  const allValues = d3.extent(continents.flatMap(c => c.values.map(v => v.Value)));

  const x = d3.scaleLinear().domain(allYears).range([0, width]);
  const y = d3.scaleLinear().domain(allValues).nice().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10)
                  .domain(continents.map(c => c.continent));

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));

  svg.append("text")
     .attr("x", width / 2)
     .attr("y", -20)
     .attr("text-anchor", "middle")
     .attr("font-size", "16px")
     .text("Change in Global Temperature by Continent");
       const line = d3.line()
       .x(d => x(d.Year))
       .y(d => y(d.Value));

  const continentGroup = svg.selectAll(".continent")
    .data(continents)
    .enter()
    .append("g")
    .attr("class", "continent");

  continentGroup.append("path")
    .attr("fill", "none")
    .attr("stroke", d => color(d.continent))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values));

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "5px");

  continentGroup.selectAll("circle")
    .data(d => d.values.map(v => ({...v, continent: d.continent})))
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Year))
    .attr("cy", d => y(d.Value))
    .attr("r", 3)
    .attr("fill", d => color(d.continent))
    .on("mouseover", (event, d) => {
      tooltip.transition().style("opacity", 1);
      tooltip.html(`<b>${d.continent}</b><br>${d.Year}: ${d.Value.toFixed(2)}°C`)
        .style("left", event.pageX + 8 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.transition().style("opacity", 0));

  const legend = svg.selectAll(".legend")
    .data(continents)
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(${width + 10},${i * 25})`);

  legend.append("rect")
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d.continent));

  legend.append("text")
    .attr("x", 18)
    .attr("y", 10)
    .text(d => d.continent);
}

    