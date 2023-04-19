//begin script when window loads
window.onload = setMap();

function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([-8.35, 33.6])
        .rotate([80.74, -10.00, 0])
        .parallels([29.50, 45.5])
        .scale(3500.51)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);


    //use Promise.all to parallelize asynchronous data loading 4265.66
    var promises = [];    
    promises.push(d3.csv("data/WIHillHeights.csv")); //load attributes from csv    
    promises.push(d3.json("data/stateBoundaries.topojson")); //load background spatial data    
    promises.push(d3.json("data/wiCounties.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);

        function callback(data){    
            csvData = data[0];    
            state = data[1];    
            county = data[2];
            console.log(csvData);
            console.log(state);
            console.log(county);    
        
            //translate europe TopoJSON
            var statesUS = topojson.feature(state, state.objects.states),
                countiesWI = topojson.feature(county, county.objects.wiCounties).features;

                console.log(statesUS)
            //add Europe countries to map
            var states = map.append("path")
                .datum(statesUS)
                .attr("class", "states")
                .attr("d", path);

            //add France regions to map
            var counties = map.selectAll(".counties")
                .data(countiesWI)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "counties " + d.properties.county;
                })
                .attr("d", path);


            //examine the results
            console.log(statesUS);
            console.log(countiesWI);
        };
};
