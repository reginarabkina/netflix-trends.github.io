// Function to load JSON data dynamically
function loadJSONData(url) {
    return fetch(url)
        .then(response => response.json());
}

// Function to categorize runtime into 'Short', 'Medium', 'Long'
function getLengthCategory(runtime) {
    const runtimeValue = parseFloat(runtime);
    if (runtimeValue <= 90) {
        return 'Short';
    } else if (runtimeValue <= 150) {
        return 'Medium';
    } else {
        return 'Long';
    }
}

// Function to render the BoxPlot and calculate medians & distributions
function renderBoxPlot() {
    loadJSONData('merged_data.json').then(data => {
        if (!data[0] || !data[0].runtime || !data[0].imdb_score) {
            console.error('Dataset does not have required columns: "runtime" and "imdb_score"');
            return;
        }

        // Format the data
        const formattedData = data.map(d => ({
            length_category: getLengthCategory(d.runtime),
            imdb_score: parseFloat(d.imdb_score)
        }));

        // Group the data by length category
        const nestedData = d3.group(formattedData, d => d.length_category);

        // Create boxplot data (min, Q1, median, Q3, max, outliers)
        const boxPlotData = Array.from(nestedData, ([category, values]) => {
            const imdbScores = values.map(d => d.imdb_score);
            imdbScores.sort(d3.ascending);

            const q1 = d3.quantile(imdbScores, 0.25);
            const median = d3.quantile(imdbScores, 0.5);
            const q3 = d3.quantile(imdbScores, 0.75);
            const min = imdbScores[0];
            const max = imdbScores[imdbScores.length - 1];

            // Calculate IQR (Interquartile Range)
            const iqr = q3 - q1;
            const lowerWhisker = q1 - 1.5 * iqr;
            const upperWhisker = q3 + 1.5 * iqr;

            // Identify outliers (values below lower whisker or above upper whisker)
            const outliers = values.filter(d => d.imdb_score < lowerWhisker || d.imdb_score > upperWhisker);

            // Calculate the distribution (for analysis purposes)
            const distribution = {
                min,
                q1,
                median,
                q3,
                max,
                outliers,
                mean: d3.mean(imdbScores),
                stdev: d3.deviation(imdbScores)
            };

            return { category, ...distribution };
        });


        // Set up SVG canvas dimensions
        const margin = { top: 20, right: 30, bottom: 60, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Create SVG element
        const svg = d3.select('#boxplot').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Set up scales
        const xScale = d3.scaleBand()
            .domain(['Short', 'Medium', 'Long'])
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(boxPlotData, d => d.max)])
            .range([height, 0]);

        // Add the X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        // Add the Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale));

        // Add axis labels
        svg.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .text('Media Length Category');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -margin.left + 15)
            .style('text-anchor', 'middle')
            .text('IMDb score');
        
        // Add title
        svg.append("text")
        .attr("x", width / 2)
        .attr("y", -5)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Distribution of IMDb scores by Media Length Category");


        // Add the boxplot elements (min, q1, median, q3, max)
        const boxplots = svg.selectAll('.box')
            .data(boxPlotData)
            .enter()
            .append('g')
            .attr('class', 'box')
            .attr('transform', d => `translate(${xScale(d.category)}, 0)`);

        // Add the box (rectangle for IQR)
        boxplots.append('rect')
            .attr('x', 0)
            .attr('y', d => yScale(d.q3))
            .attr('width', xScale.bandwidth())
            .attr('height', d => yScale(d.q1) - yScale(d.q3))
            .attr('fill', '#247ba0');

        // Add the median line
        boxplots.append('line')
            .attr('x1', 0)
            .attr('x2', xScale.bandwidth())
            .attr('y1', d => yScale(d.median))
            .attr('y2', d => yScale(d.median))
            .attr('stroke', '#000')
            .attr('stroke-width', 2);

        // Add the whiskers (min and max)
        boxplots.append('line')
            .attr('x1', xScale.bandwidth() / 2)
            .attr('x2', xScale.bandwidth() / 2)
            .attr('y1', d => yScale(d.min))
            .attr('y2', d => yScale(d.q1))
            .attr('stroke', '#000');

        boxplots.append('line')
            .attr('x1', xScale.bandwidth() / 2)
            .attr('x2', xScale.bandwidth() / 2)
            .attr('y1', d => yScale(d.max))
            .attr('y2', d => yScale(d.q3))
            .attr('stroke', '#000');

        // Add outliers as individual points
        boxplots.selectAll('.outlier')
            .data(d => d.outliers)
            .enter()
            .append('circle')
            .attr('class', 'outlier')
            .attr('cx', xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.imdb_score))
            .attr('r', 3)
            .attr('fill', '#fb3640')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
    }).catch(console.error);
}

// Call the function to render the boxplot
window.onload = renderBoxPlot;