// Load the data
const agedata = d3.csv("age_data.csv");

// Once the data is loaded, create the bar plot
agedata.then(function(data) {
   // Convert IMDb votes to numeric
   data.forEach(d => {
      d.imdb_votes = +d.imdb_votes;
      d.imdb_score = +d.imdb_score;
   });

   // Define the dimensions and margins for the SVG
   let width = 700, height = 500;

   let margin = {
      top: 50,
      bottom:50,
      right:70, 
      left:70
   };

   // Group by score -- get the avg. score and total number of votes
   let grouped = d3.rollups(
      data,
      v => ({avg_score: d3.mean(v, d => d.imdb_score),
            total_votes: d3.sum(v, d => d.imdb_votes)
      }),
      d => d.rating
   ).map(([rating, info]) => ({ rating, ...info }));

   // Set order as increasing maturity level
   let rating_order = ["TV-Y", "TV-Y7", "TV-G", "G", "TV-PG", "PG", "TV-14", "PG-13", "TV-MA", "R", "NC-17", "NR"];
   grouped.sort((a, b) => rating_order.indexOf(a.rating) - rating_order.indexOf(b.rating));

   // Create the SVG container
   let svg = d3.select("#barplot")
               .append("svg")
               .attr("width", width + margin.left + margin.right)
               .attr("height", height + margin.top + margin.bottom)
               .append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale 
   let x = d3.scaleLinear()
             .domain([0, 10])
             .range([0, width]);

   // Y scale 
   let y = d3.scaleBand()
             .domain(grouped.map(d => d.rating))
             .range([0, height])
             .padding(0.25);

   // Create color scale
   let vote_count = d3.extent(grouped, d => d.total_votes);
   
   let color = d3.scaleSequential()
                 .domain(vote_count)
                 .interpolator(d3.interpolateRdBu);

   // Tool tip
   let tooltip = d3.select("body")
                   .append("div")
                   .style("opacity", 0)
                   .style("background", "#fff9c4")
                   .style("position", "absolute")
                   .style("border", "1px")
                   .style("padding", "6px");
   // Add X-axis
   svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))

   // Add Y-axis
   svg.append("g")
      .attr("transform", `translate(0, 0)`)
      .call(d3.axisLeft(y));

   // Draw the bars
   svg.selectAll(".bar")
      .data(grouped)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", d => y(d.rating))
      .attr("height", y.bandwidth())
      .attr("width", d => x(d.avg_score))
      .attr("fill", d => color(d.total_votes))
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .on("mouseover", function(event, d) {
         d3.select(this)
           .attr("stroke", "white");
         tooltip.transition()
                .duration(200)
                .style("opacity", 1);
         tooltip.html(`
                  ${d.rating}<br>
                  Average Score: ${d.avg_score.toFixed(4)}<br>
                  Total Votes: ${d.total_votes.toLocaleString()}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");

      }).on("mouseout", function(event, d) {
         d3.select(this)
           .attr("stroke", "black");
         tooltip.transition()
                .duration(200)
                .style("opacity", 0)
   });

   // Add x axis label
   svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .style("text-anchor", "middle")
      .text("Average IMDb Score");

   // Add y axis label
   svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .text("Age Rating");

   // Add title
   svg.append("text")
      .attr("x", width / 2)
      .attr("y", -1)
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .text("Average IMDb Score by Age Rating with Varying Frequency of Votes");

   // Add legend for the color
   let legend_height = 10;
   let legend_width = 150;
   let legend_x = width - 180;
   let legend_y = 120;
   
   let legend_svg = svg.append("g")
                       .attr("transform", `translate(${legend_x}, ${legend_y})`);
   
   // Gradient
   let defs = svg.append("defs");
   let gradient = defs.append("linearGradient")
                      .attr("id", "legend-gradient")
                      .attr("x1", "0%")
                      .attr("x2", "100%");
   
   gradient.selectAll("stop")
           .data(d3.ticks(0, 1, 10))
           .enter()
           .append("stop")
           .attr("offset", d => `${d * 100}%`)
           .attr("stop-color", d => color(vote_count[0] + d * (vote_count[1] - vote_count[0])));
   
   legend_svg.append("rect")
             .attr("width", legend_width)
             .attr("height", legend_height)
             .style("fill", "url(#legend-gradient)");
   
       // Legend axis
   let legend_scale = d3.scaleLinear()
           .domain(vote_count)
           .range([0, legend_width]);
   
   let legend_axis = d3.axisBottom(legend_scale)
           .ticks(5)
           .tickFormat(d3.format(".2s"));
   
   legend_svg.append("g")
           .attr("transform", `translate(0, ${legend_height})`)
           .call(legend_axis);
   
   legend_svg.append("text")
           .attr("x", legend_width / 2)
           .attr("y", -10)
           .attr("text-anchor", "middle")
           .style("font-size", "12px")
           .text("Total IMDb Votes");
});