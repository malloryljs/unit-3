(function(){

    //pseudo-global variables
    var attrArray = ["elevationFt", "totalareaSQMiles", "totallandSQMiles", "totalwaterSQMiles", "forestSQMiles"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //begin script when window loads
    window.onload = setMap();

    function setMap(){

        //set map frame dimensions
        var width = window.innerWidth * 0.5,
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
                var csvdata = data[0], state = data[1], county = data[2] 
            
                //translate state topojson
                var statesUS = topojson.feature(state, state.objects.states),
                    countiesWI = topojson.feature(county, county.objects.wiCounties).features;

                //add surrounding states to map
                var states = map.append("path")
                    .datum(statesUS)
                    .attr("class", "states")
                    .attr("d", path);
                
                countiesWI = joinData(countiesWI, csvdata);
                
                var colorScale = makeColorScale(csvdata);

                setEnumerationUnits(countiesWI, map, path, colorScale);

                setChart(csvdata, colorScale);

            };
    };

   //function to create coordinated bar chart
    function setChart(csvdata, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 2500]);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvdata)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.county;
            })
            .attr("width", chartInnerWidth / csvdata.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvdata.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[0] + " in each region");

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        };

        

        function joinData(countiesWI, csvdata){
            for (var i=0; i<csvdata.length; i++){
                var csvRegion = csvdata[i]; //the current region
                var csvKey = csvRegion.county; //the CSV primary key
        
                //loop through geojson regions to find correct region
                for (var a=0; a<countiesWI.length; a++){
        
                    var geojsonProps = countiesWI[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.NAME; //the geojson primary key
        
                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){
        
                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };

            return countiesWI;
        };

        //Example 1.4 line 11...function to create color scale generator
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            //create color scale generator
            var colorScale = d3.scaleQuantile()
                .range(colorClasses);

            //build two-value array of minimum and maximum expressed attribute values
            var minmax = [
                d3.min(data, function(d) { return parseFloat(d[expressed]); }),
                d3.max(data, function(d) { return parseFloat(d[expressed]); })
            ];
            //assign two-value array as scale domain
            colorScale.domain(minmax);

            return colorScale;
        };
        

        function setEnumerationUnits(countiesWI,map,path,colorScale){    
            //add wiconsin counties to map    
            var counties = map.selectAll(".counties")        
                .data(countiesWI)        
                .enter()        
                .append("path")        
                .attr("class", function(d){            
                    return "counties " + d.properties.county;        
                })        
                .attr("d", path)        
                    .style("fill", function(d){            
                        var value = d.properties[expressed];            
                        if(value) {                
                            return colorScale(d.properties[expressed]);            
                        } else {                
                            return "#ccc";            
                        }    
                });
        };
})();