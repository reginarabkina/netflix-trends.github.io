fetch("scatterplot.json")
    .then(response => response.json())
    .then(spec => {
        vegaEmbed("#chart", spec);
    })
    .catch(console.error);