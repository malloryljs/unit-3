//begin script when window loads
window.onload = setMap();

function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/WIHillHeights.csv"),                    
                    d3.json("data/wiCounties.topojson")           
                    ];    
        Promise.all(promises).then(callback);    

        function callback(data){    
            csvData = data[0];    
            wi = data[1];    
            console.log(csvData);
            console.log(wi);  
            
         
            // var projection = d3.geoAlbers()
            //     .center([0, 46.2])
            //     .rotate([-2, 0])
            //     .parallels([43, 62])
            //     .scale(2500)
            //     .translate([width / 2, height / 2]);
    
            // var path = d3.geoPath()
            // .projection(projection);

            //translate europe TopoJSON
            var wiCounties = topojson.feature(wi, wi.objects.county).features;

            //add wi counties to map
            var counties = map.append("path")
                .datum(wiCounties)
                .attr("class", "counties")
                .attr("d", path);
        };
};