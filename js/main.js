(function(){

    //pseudo-global variables
    var attrArray = ["elevationFt", "totalareaSQMiles", "landareaSQMiles", "waterareaSQMiles", "forestSQMiles"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 125]);

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
            .center([-9.09, 57.24])
            .rotate([82.82, 12.73, 0])
            .parallels([16.32, 53.71])
            .scale(4568.68)
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

                createDropdown(csvdata);

                setLabel(csvdata);

            };
    };

   //function to create coordinated bar chart
    function setChart(csvdata, colorScale){
        

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
            .domain([0, 2000]);

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
            .on("mouseover", function(event, d){
                highlight(d);
            })

            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);
            
        updateChart(bars, csvdata.length, colorScale);   

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
        

    function createDropdown(csvdata){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvdata)
            });
    
        //add initial option
        var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    
    function changeAttribute(attribute, csvdata){
        //change the expressed attribute
        expressed = attribute;
    
        //recreate the color scale
        var colorScale = makeColorScale(csvdata);
    
        //recolor enumeration units
        var regions = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
            });
        
        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvdata.length) + leftPadding;
            })
            //resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
                
        
        });

        updateChart(bars, csvdata.length, colorScale);

    };

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
        });

        var chartTitle = d3.select(".chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");
    };

    function joinData(countiesWI, csvdata){
        for (var i=0; i<csvdata.length; i++){
            var csvRegion = csvdata[i]; //the current region
            var csvKey = csvRegion.NAME; //the CSV primary key
    
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
            "#f6eff7",
            "#bdc9e1",
            "#67a9cf",
            "#1c9099",
            "#016c59"
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
    
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", "blue")
            .style("stroke-width", "2");
    };

    function dehighlight(){
        //change stroke
        var regions = d3.selectAll(".counties")
            .style("stroke", "black")
            .style("stroke-width", "0.5");

        var regions = d3.selectAll(".bar")
            .style("stroke", "none")
            .style("stroke-width", "0.0");
    };

    function setEnumerationUnits(countiesWI,map,path,colorScale){    
        //add wiconsin counties to map    
        var counties = map.selectAll(".counties")        
            .data(countiesWI)        
            .enter()        
            .append("path")        
            .attr("class", function(d){            
                return "counties " + d.properties.NAME;        
            })        
            .attr("d", path)        
                .style("fill", function(d){            
                    var value = d.properties[expressed];            
                    if(value) {                
                        return colorScale(d.properties[expressed]);            
                    } else {                
                        return "#ccc";            
                    }  
                })
                
            .on("mouseover", function(event, d){
                highlight(d.properties)
            })

            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);

            
            
    };

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.NAME + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.NAME);
    };

    //Example 2.8 line 1...function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
   


})();