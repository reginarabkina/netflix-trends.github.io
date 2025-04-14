// Function to load JSON data dynamically
function loadJSONData(url) {
    return fetch(url)
        .then(response => response.json());
}

// Function to determine if content is a movie or show
function getContentType(item) {
  
    // More robust check that accounts for different data structures
    // This function explicitly returns either "Movie" or "TV Show"
    
    // If we have the type field directly
    if (item.type) {
        const type = item.type.toLowerCase();
        if (type.includes('movie')) return 'Movie';
        if (type.includes('show') || type.includes('series') || type.includes('tv')) return 'TV Show';
    }
    
    // If we have a series_or_movie field
    if (item.series_or_movie) {
        const type = item.series_or_movie.toLowerCase();
        if (type.includes('movie')) return 'Movie';
        if (type.includes('show') || type.includes('series') || type.includes('tv')) return 'TV Show';
    }
    
    // Check for fields that might indicate TV shows
    if (item.seasons || item.episodes || item.episode_count) {
        return 'TV Show';
    }
   
}

// Function to categorize runtime into 'Short', 'Medium', 'Long'
function getLengthCategory(runtime) {
    const runtimeValue = parseFloat(runtime);
    if (isNaN(runtimeValue)) {
        return 'Medium'; // Default if runtime is not a number
    }
    if (runtimeValue <= 90) {
        return 'Short';
    } else if (runtimeValue <= 150) {
        return 'Medium';
    } else {
        return 'Long';
    }
}

// Global variables to store data
let allFormattedData = [];
let svg, xScaleOuter, xScaleInner, yScale, colorScale, height, width, margin;

// Function to prepare data and set up visualization
function setupVisualization(data) {
    // Format the data with both content type and length category
    allFormattedData = data.map(d => {
        const contentType = getContentType(d);
        const runtime = d.runtime || '120'; // Default runtime if missing
        
        return {
            content_type: contentType,
            length_category: getLengthCategory(runtime),
            imdb_score: parseFloat(d.imdb_score) || 5.0 // Default score if missing or NaN
        };
    });

    // Log distribution to check if we have both categories
    const contentTypeCounts = allFormattedData.reduce((acc, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
    }, {});
    console.log("Content type distribution:", contentTypeCounts);

    // Create a combined category (e.g., "Movie-Short", "TV Show-Long")
    allFormattedData.forEach(d => {
        d.combined_category = `${d.content_type}-${d.length_category}`;
    });
    
    // Set up SVG canvas dimensions 
    margin = { top: 40, right: 40, bottom: 80, left: 60 };
    width = 800 - margin.left - margin.right;
    height = 450 - margin.top - margin.bottom;

    // Create SVG element
    svg = d3.select('#boxplot').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    // X scale: content type (Movie or TV Show)
    xScaleOuter = d3.scaleBand()
        .domain(['Movie', 'TV Show'])
        .range([0, width])
        .padding(0.2);
    
    // Inner X scale: length category within content type (Short, Medium, Long)
    xScaleInner = d3.scaleBand()
        .domain(['Short', 'Medium', 'Long'])
        .range([0, xScaleOuter.bandwidth()])
        .padding(0.1);

    // Color scale for length categories
    colorScale = d3.scaleOrdinal()
        .domain(['Short', 'Medium', 'Long'])
        .range(['#247ba0', '#70c1b3', '#b2dbbf']);

    // Add the X axis for content types
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScaleOuter))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-weight", "bold");

    // Add the Y axis 
    svg.append('g')
        .attr('class', 'y-axis');

    // Add axis labels
    svg.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 8})`)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text('Content Type');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text('IMDb score');
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Distribution of IMDb Scores by Content Type and Length");
        
    // Add legend
    const legendData = ['Short', 'Medium', 'Long'];
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 40}, 20)`);
        
    legendData.forEach((category, i) => {
        legend.append('rect')
            .attr('x', 0)
            .attr('y', i * 20)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', colorScale(category));
            
        legend.append('text')
            .attr('x', 20)
            .attr('y', i * 20 + 12)
            .text(category);
    });
    
    // Create dropdown for filtering
    const filterContainer = d3.select('#boxplot')
        .insert('div', 'svg')
        .attr('class', 'filter-container')
        .style('margin-bottom', '20px')
        .style('text-align', 'center');
        
    filterContainer.append('label')
        .attr('for', 'content-filter')
        .text('Filter by Content Type: ')
        .style('font-weight', 'bold')
        .style('margin-right', '10px');
        
    filterContainer.append('select')
        .attr('id', 'content-filter')
        .style('padding', '5px')
        .style('border-radius', '4px')
        .on('change', function() {
            updateVisualization(this.value);
        })
        .selectAll('option')
        .data(['All', 'Movie', 'TV Show'])
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => d);
        
    // Initial visualization with all data
    updateVisualization('All');
}

// Function to update visualization based on filter selection
function updateVisualization(filter) {
    // Filter data based on selection
    let filteredData = allFormattedData;
    if (filter !== 'All') {
        filteredData = allFormattedData.filter(d => d.content_type === filter);
    }
    
    // Create a combined category (e.g., "Movie-Short", "TV Show-Long")
    filteredData.forEach(d => {
        d.combined_category = `${d.content_type}-${d.length_category}`;
    });

    // Group the data by the combined category
    const nestedData = d3.group(filteredData, d => d.combined_category);
    
    // Log the groups to see what we have
    console.log("Data groups:", Array.from(nestedData.keys()));

    // Create boxplot data for each group
    const boxPlotData = Array.from(nestedData, ([combinedCategory, values]) => {
        const [contentType, lengthCategory] = combinedCategory.split('-');
        const imdbScores = values.map(d => d.imdb_score).filter(score => !isNaN(score));
        
        if (imdbScores.length === 0) {
            console.error(`No valid scores for category: ${combinedCategory}`);
            return null;
        }
        
        imdbScores.sort(d3.ascending);

        const q1 = d3.quantile(imdbScores, 0.25);
        const median = d3.quantile(imdbScores, 0.5);
        const q3 = d3.quantile(imdbScores, 0.75);
        const min = imdbScores[0];
        const max = imdbScores[imdbScores.length - 1];

        // Calculate IQR (Interquartile Range)
        const iqr = q3 - q1;
        const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
        const upperWhisker = Math.min(max, q3 + 1.5 * iqr);

        // Identify outliers
        const outliers = values.filter(d => {
            const score = d.imdb_score;
            return score < lowerWhisker || score > upperWhisker;
        });

        return {
            combinedCategory,
            contentType,
            lengthCategory,
            min: lowerWhisker,
            q1,
            median,
            q3,
            max: upperWhisker,
            outliers,
            count: values.length
        };
    }).filter(d => d !== null);

    console.log("BoxPlot data prepared:", boxPlotData);
    
    // Update Y scale based on current data
    yScale = d3.scaleLinear()
        .domain([0, d3.max(boxPlotData, d => d.max) * 1.1]) // Add some padding at the top
        .range([height, 0]);
        
    // Update Y axis
    svg.select('.y-axis')
        .transition()
        .duration(500)
        .call(d3.axisLeft(yScale));
    
    // Determine which content types to show based on filter
    let displayContentTypes = ['Movie', 'TV Show'];
    if (filter !== 'All') {
        displayContentTypes = [filter];
    }
    
    // Remove existing boxplots
    svg.selectAll('.content-type-group').remove();
    
    // Define innerWidth for single content type centering
    let innerWidth = width;
    
    // Update X scales based on filter
    if (filter === 'All') {
        // For 'All', use the full width
        xScaleOuter = d3.scaleBand()
            .domain(displayContentTypes)
            .range([0, width])
            .padding(0.2);
    } else {
        // For single content type, center in the middle of the chart
        // Use a smaller width for the single content type
        innerWidth = width * 0.5; // Use 50% of total width for single type
        const offsetX = (width - innerWidth) / 2; // Center the single box
        
        xScaleOuter = d3.scaleBand()
            .domain(displayContentTypes)
            .range([offsetX, offsetX + innerWidth])
            .padding(0.2);
    }
    
    // Update X axis
    svg.select('.x-axis')
        .transition()
        .duration(500)
        .call(d3.axisBottom(xScaleOuter));
    
    // Create groups for each content type to be displayed
    const contentTypeGroups = svg.selectAll('.content-type-group')
        .data(displayContentTypes)
        .enter()
        .append('g')
        .attr('class', 'content-type-group')
        .attr('transform', d => `translate(${xScaleOuter(d)},0)`);

    // Draw boxplots within each content type group
    contentTypeGroups.each(function(contentType) {
        const group = d3.select(this);
        
        // Filter data for this content type
        const contentTypeData = boxPlotData.filter(d => d.contentType === contentType);
        
        console.log(`Data for ${contentType}:`, contentTypeData);
        
        if (contentTypeData.length === 0) {
            // If no data for this content type, add text indication
            group.append('text')
                .attr('x', xScaleOuter.bandwidth() / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .text('No data available');
            return;
        }
        
        // Re-setup inner scale for length categories
        // This ensures it uses the current bandwidth for proper spacing
        const xScaleInner = d3.scaleBand()
            .domain(['Short', 'Medium', 'Long'])
            .range([0, xScaleOuter.bandwidth()])
            .padding(0.1);
        
        // Create boxplots for each length category
        const boxplots = group.selectAll('.box')
            .data(contentTypeData)
            .enter()
            .append('g')
            .attr('class', 'box')
            .attr('transform', d => `translate(${xScaleInner(d.lengthCategory)},0)`);

        // Add the box (rectangle for IQR)
        boxplots.append('rect')
            .attr('x', 0)
            .attr('y', d => yScale(d.q3))
            .attr('width', xScaleInner.bandwidth())
            .attr('height', d => yScale(d.q1) - yScale(d.q3))
            .attr('fill', d => colorScale(d.lengthCategory))
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        // Add the median line
        boxplots.append('line')
            .attr('x1', 0)
            .attr('x2', xScaleInner.bandwidth())
            .attr('y1', d => yScale(d.median))
            .attr('y2', d => yScale(d.median))
            .attr('stroke', '#000')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        // Add the whiskers (min and max)
        boxplots.append('line')
            .attr('x1', xScaleInner.bandwidth() / 2)
            .attr('x2', xScaleInner.bandwidth() / 2)
            .attr('y1', d => yScale(d.min))
            .attr('y2', d => yScale(d.q1))
            .attr('stroke', '#000')
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        boxplots.append('line')
            .attr('x1', xScaleInner.bandwidth() / 2)
            .attr('x2', xScaleInner.bandwidth() / 2)
            .attr('y1', d => yScale(d.max))
            .attr('y2', d => yScale(d.q3))
            .attr('stroke', '#000')
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        // Add horizontal whisker caps
        boxplots.append('line')
            .attr('x1', xScaleInner.bandwidth() * 0.25)
            .attr('x2', xScaleInner.bandwidth() * 0.75)
            .attr('y1', d => yScale(d.min))
            .attr('y2', d => yScale(d.min))
            .attr('stroke', '#000')
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        boxplots.append('line')
            .attr('x1', xScaleInner.bandwidth() * 0.25)
            .attr('x2', xScaleInner.bandwidth() * 0.75)
            .attr('y1', d => yScale(d.max))
            .attr('y2', d => yScale(d.max))
            .attr('stroke', '#000')
            .attr('opacity', 0)
            .transition()
            .duration(750)
            .attr('opacity', 1);

        // Add outliers as individual points
        boxplots.selectAll('.outlier')
            .data(d => d.outliers.map(o => ({...o, category: d.combinedCategory})))
            .enter()
            .append('circle')
            .attr('class', 'outlier')
            .attr('cx', xScaleInner.bandwidth() / 2)
            .attr('cy', d => yScale(d.imdb_score))
            .attr('r', 0)
            .attr('fill', '#fb3640')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .transition()
            .duration(750)
            .attr('r', 3);
            
        // Add length category labels inside each content type group
        group.selectAll('.length-label')
            .data(['Short', 'Medium', 'Long'])
            .enter()
            .append('text')
            .attr('class', 'length-label')
            .attr('x', d => xScaleInner(d) + xScaleInner.bandwidth() / 2)
            .attr('y', height + 40) // INCREASED THE Y VALUE TO MOVE DOWN
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px') // ADDED FONT SIZE
            .text(d => d);
            
        // Add sample size labels
        boxplots.append('text')
            .attr('x', xScaleInner.bandwidth() / 2)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('opacity', 0)
            .text(d => `n=${d.count}`)
            .transition()
            .duration(750)
            .attr('opacity', 1);
            
        // Add tooltips with statistics
        boxplots.selectAll('rect')
            .on('mouseover', function(event, d) {
                // Create tooltip
                const tooltip = d3.select('#boxplot')
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(255, 255, 255, 0.9)')
                    .style('padding', '10px')
                    .style('border', '1px solid #333')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('font-size', '12px')
                    .style('z-index', '100') // ADDED Z-INDEX TO ENSURE TOOLTIP DISPLAYS ON TOP
                    .style('opacity', 0)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 15) + 'px')
                    .html(`
                        <strong>${d.contentType} - ${d.lengthCategory}</strong><br>
                        <table style="margin-top: 5px;">
                            <tr><td>Median:</td><td>${d.median.toFixed(1)}</td></tr>
                            <tr><td>Q1 (25%):</td><td>${d.q1.toFixed(1)}</td></tr>
                            <tr><td>Q3 (75%):</td><td>${d.q3.toFixed(1)}</td></tr>
                            <tr><td>Min:</td><td>${d.min.toFixed(1)}</td></tr>
                            <tr><td>Max:</td><td>${d.max.toFixed(1)}</td></tr>
                            <tr><td>Count:</td><td>${d.count}</td></tr>
                            <tr><td>Outliers:</td><td>${d.outliers.length}</td></tr>
                        </table>
                    `);
                    
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                // Highlight the box
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke', '#ff6700')
                    .attr('stroke-width', 2);
            })
            .on('mousemove', function(event) {
                // Move tooltip with cursor
                d3.select('.tooltip')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function() {
                // Remove tooltip
                d3.select('.tooltip').remove();
                
                // Reset box highlight
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1);
            });
    });
}

// Function to render the BoxPlot
function renderBoxPlot() {
    loadJSONData('merged_data.json').then(data => {
        if (!data[0] || !data[0].imdb_score) {
            console.error('Dataset does not have required column: "imdb_score"');
            return;
        }

        console.log("Total data items:", data.length);
        setupVisualization(data);
        
    }).catch(error => {
        console.error("Error loading or processing data:", error);
        
        // Show error message in the visualization area
        d3.select('#boxplot')
            .append('div')
            .style('color', 'red')
            .style('text-align', 'center')
            .style('padding', '20px')
            .html(`<h3>Error loading data</h3><p>${error.message}</p>`);
    });
}

// Call the function to render the boxplot
window.onload = renderBoxPlot;