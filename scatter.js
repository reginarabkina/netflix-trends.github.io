d3.json("merged_data.json").then(function(data) {
    // Process data
    let groupedData = d3.rollups(
        data,
        v => ({
            num_releases: v.length,
            avg_rating: d3.mean(v, d => +d.imdb_score)
        }),
        d => d.release_year,
        d => d.type
    );
    let processedData = [];
    groupedData.forEach(([year, types]) => {
        types.forEach(([type, values]) => {
            processedData.push({
                release_year: year,
                type: type,
                num_releases: values.num_releases,
                avg_rating: values.avg_rating
            });
        });
    });

    // Set up dimensions
    const width = 900, height = 500, margin = { top: 50, right: 180, bottom: 80, left: 60 };

    // Create scales
    const xScale = d3.scaleBand()
        .domain(processedData.map(d => String(d.release_year)))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([d3.min(processedData, d => d.avg_rating) - 0.5, d3.max(processedData, d => d.avg_rating) + 0.5])
        .range([height - margin.bottom, margin.top]);

    const sizeScale = d3.scaleSqrt()
        .domain([0, 300]) 
        .range([2, 30]);

    const colorScale = d3.scaleOrdinal()
        .domain(["MOVIE", "SHOW"])
        .range(["blue", "red"]);

    // Create SVG container
    const svg = d3.select("#scatter").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add circles
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("display", "none");

    svg.selectAll("circle")
        .data(processedData)
        .enter().append("circle")
        .attr("cx", d => xScale(String(d.release_year)) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.avg_rating))
        .attr("r", d => sizeScale(d.num_releases))
        .attr("fill", d => colorScale(d.type))
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>Year:</strong> ${d.release_year}<br>
                    <strong>Type:</strong> ${d.type}<br>
                    <strong>Releases:</strong> ${d.num_releases}<br>
                    <strong>Avg Rating:</strong> ${d.avg_rating.toFixed(2)}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
        });

    // Add axes
    const xAxis = d3.axisBottom(xScale)
    .tickValues(processedData.map(d => String(d.release_year)).filter((d, i) => i % 5 === 0)) // Show every 5th year
    .tickFormat(d => d);

svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-30)") // Slightly angled for better readability
    .style("text-anchor", "end")
    .style("font-size", "12px");

    const yAxis = d3.axisLeft(yScale);


    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis);

    // Axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 30)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Release Year");

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-size", "14px")
        .text("Average IMDb Rating");

    // Chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Number of Releases vs. Average Rating by Year (Movies & TV Shows)");

    // ** LEGEND **

    const legend = svg.append("g")
        .attr("transform", `translate(${width - 140}, ${margin.top})`);

    // Color legend
    const types = ["MOVIE", "SHOW"];
    types.forEach((type, i) => {
        legend.append("circle")
            .attr("cx", 10)
            .attr("cy", i * 25)
            .attr("r", 8)
            .attr("fill", colorScale(type));

        legend.append("text")
            .attr("x", 25)
            .attr("y", i * 25 + 5)
            .style("font-size", "12px")
            .text(type);
    });

    // Size legend
    const sizeLegendValues = [0, 50, 100, 150, 200, 250, 300]; 
    const sizeLegendSpacing = 30;

    const sizeLegend = svg.append("g")
        .attr("transform", `translate(${width - 140}, ${margin.top + 60})`);

    sizeLegend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Releases");

    sizeLegendValues.forEach((value, i) => {
        sizeLegend.append("circle")
            .attr("cx", 10)
            .attr("cy", i * sizeLegendSpacing)
            .attr("r", sizeScale(value))
            .attr("fill", "gray")
            .attr("opacity", 0.5);

        sizeLegend.append("text")
            .attr("x", 40)
            .attr("y", i * sizeLegendSpacing + 5)
            .style("font-size", "12px")
            .text(value);
    });
});
