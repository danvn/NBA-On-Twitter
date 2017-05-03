var margin = {top: 20, right: 300, bottom: 100, left: 100},
    margin2 = { top: 430, right: 10, bottom: 20, left: 100 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;

var parseDate = d3.time.format("%Y%m%d").parse;
var bisectDate = d3.bisector(function(d) { return d.date; }).left;

var xScale = d3.time.scale()
    .range([0, width]),

    xScale2 = d3.time.scale()
    .range([0, width]); // Duplicate xScale for brushing ref later

var yScale = d3.scale.linear()
    .range([height, 0]);

// 40 Custom DDV colors 
var color = d3.scale.ordinal().range(["#48A36D",  "#56AE7C",  "#64B98C", "#72C39B", "#80CEAA", "#80CCB3", "#7FC9BD", "#7FC7C6", "#7EC4CF", "#7FBBCF", "#7FB1CF", "#80A8CE", "#809ECE", "#8897CE", "#8F90CD", "#9788CD", "#9E81CC", "#AA81C5", "#B681BE", "#C280B7", "#CE80B0", "#D3779F", "#D76D8F", "#DC647E", "#E05A6D", "#E16167", "#E26962", "#E2705C", "#E37756", "#E38457", "#E39158", "#E29D58", "#E2AA59", "#E0B15B", "#DFB95C", "#DDC05E", "#DBC75F", "#E3CF6D", "#EAD67C", "#F2DE8A"]);  


var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom"),

    xAxis2 = d3.svg.axis() // xAxis for brush slider
    .scale(xScale2)
    .orient("bottom");    

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");  

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return xScale(d.date); })
    .y(function(d) { return yScale(d.rating); })
    .defined(function(d) { return d.rating; });  // Hiding line value defaults of 0 for missing data

var maxY; // Defined later to update yAxis

var svg = d3.select("#chart2").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom) //height + margin.top + margin.bottom
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create invisible rect for mouse tracking
svg.append("rect")
    .attr("width", width)
    .attr("height", height)                                    
    .attr("x", 0) 
    .attr("y", 0)
    .attr("id", "mouse-tracker")
    .style("fill", "white"); 

//for slider part-----------------------------------------------------------------------------------
  
var context = svg.append("g") // Brushing context box container
    .attr("transform", "translate(" + 0 + "," + 410 + ")")
    .attr("class", "context");

//append clip path for lines plotted, hiding those part out of bounds
svg.append("defs")
  .append("clipPath") 
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height); 

//end slider part----------------------------------------------------------------------------------- 

d3.tsv("public/all_teams.tsv", function(error, data) { 
  color.domain(d3.keys(data[0]).filter(function(key) { // Set the domain of the color ordinal scale to be all the csv headers except "date", matching a color to an issue
    return key !== "date"; 
  }));

  data.forEach(function(d) { // Make every date in the csv data a javascript date object format
    d.date = parseDate(d.date);
  });

  var categories = color.domain().map(function(name) { // Nest the data into an array of objects with new keys

    return {
      name: name, // "name": the csv headers except date
      values: data.map(function(d) { // "values": which has an array of the dates and ratings
        return {
          date: d.date, 
          rating: +(d[name]),
          };
      }),
      visible: (name === "Unemployment" ? true : false) // "visible": all false except for economy which is true.
    };
  });

  xScale.domain(d3.extent(data, function(d) { return d.date; })); // extent = highest and lowest points, domain is data, range is bouding box

  yScale.domain([0, 100
    //d3.max(categories, function(c) { return d3.max(c.values, function(v) { return v.rating; }); })
  ]);

  xScale2.domain(xScale.domain()); // Setting a duplicate xdomain for brushing reference later
 
 //for slider part-----------------------------------------------------------------------------------

 var brush = d3.svg.brush()//for slider bar at the bottom
    .x(xScale2) 
    .on("brush", brushed);

  context.append("g") // Create brushing xAxis
      .attr("class", "x axis1")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);
  
  var contextArea = d3.svg.area() // Set attributes for area chart in brushing context graph
    .interpolate("monotone")
    .x(function(d) { return xScale2(d.date); }) // x is scaled to xScale2
    .y0(height2) // Bottom line begins at height2 (area chart not inverted) 
    .y1(0); // Top line of area, 0 (area chart not inverted)

  //plot the rect as the bar at the bottom
  context.append("path") // Path is created using svg.area details
    .attr("class", "area")
    .attr("d", contextArea(categories[0].values)) // pass first categories data .values to area path generator 
    .attr("fill", "#F1F1F2");
    
  //append the brush for the selection of subsection  
  context.append("g")
    .attr("class", "x brush")
    .call(brush)
    .selectAll("rect")
    .attr("height", height2) // Make brush rects same height 
      .attr("fill", "#E6E7E8");  
  //end slider part-----------------------------------------------------------------------------------

  // draw line graph
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("x", -10)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Number of Mentions");

  var issue = svg.selectAll(".issue")
      .data(categories) // Select nested data and append to new svg group elements
    .enter().append("g")
      .attr("class", "issue");   

  issue.append("path")
      .attr("class", "line")
      .style("pointer-events", "none") // Stop line interferring with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(" ", "").replace("/", ""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .attr("d", function(d) { 
        return d.visible ? line(d.values) : null; // If array key "visible" = true then draw line, if not then don't 
      })
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
      .style("stroke", function(d) { return color(d.name); });

  // draw legend
  var legendSpace = 450 / categories.length; // 450/number of issues (ex. 40)    

  issue.append("rect")
      .attr("width", 10)
      .attr("height", 10)                                    
      .attr("x", width + (margin.right/3) - 15) 
      .attr("y", function (d, i) { return (legendSpace)+i*(legendSpace) - 8; })  // spacing
      .attr("fill",function(d) {
        return d.visible ? color(d.name) : "#F1F1F2"; // If array key "visible" = true then color rect, if not then make it grey 
      })
      .attr("class", "legend-box")

      .on("click", function(d){ // On click make d.visible 
        d.visible = !d.visible; // If array key for this data selection is "visible" = true then make it false, if false then make it true

        maxY = findMaxY(categories); // Find max Y rating value categories data with "visible"; true
        yScale.domain([0,maxY]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true
        svg.select(".y.axis")
          .transition()
          .call(yAxis);   

        issue.select("path")
          .transition()
          .attr("d", function(d){
            return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
          })

        issue.select("rect")
          .transition()
          .attr("fill", function(d) {
          return d.visible ? color(d.name) : "#F1F1F2";
        });
      })

      .on("mouseover", function(d){

        d3.select(this)
          .transition()
          .attr("fill", function(d) { return color(d.name); });

        d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
          .transition()
          .style("stroke-width", 2.5);  
      })

      .on("mouseout", function(d){

        d3.select(this)
          .transition()
          .attr("fill", function(d) {
          return d.visible ? color(d.name) : "#F1F1F2";});

        d3.select("#line-" + d.name.replace(" ", "").replace("/", ""))
          .transition()
          .style("stroke-width", 1.5);
      })
      
  issue.append("text")
      .attr("x", width + (margin.right/3)) 
      .attr("y", function (d, i) { return (legendSpace)+i*(legendSpace); })  // (return (11.25/2 =) 5.625) + i * (5.625) 
      .text(function(d) { return d.name; }); 

  // Hover line 
  var hoverLineGroup = svg.append("g") 
            .attr("class", "hover-line");

  var hoverLine = hoverLineGroup // Create line with basic attributes
        .append("line")
            .attr("id", "hover-line")
            .attr("x1", 10).attr("x2", 10) 
            .attr("y1", 0).attr("y2", height + 10)
            .style("pointer-events", "none") // Stop line interferring with cursor
            .style("opacity", 1e-6); // Set opacity to zero 

  var hoverDate = hoverLineGroup
        .append('text')
            .attr("class", "hovering-text")
            .attr("y", height - (height-40)) // hover date text position
            .attr("x", width - 150) // hover date text position
            .style("fill", "#E6E7E8");

  var columnNames = d3.keys(data[0]) //grab the key values from your first data row
                                     //these are the same as your column names
                  .slice(1); //remove the first column name (`date`);

  var focus = issue.select("g") // create group elements to house tooltip text
      .data(columnNames) // bind each column name date to each g element
    .enter().append("g") //create one <g> for each columnName
      .attr("class", "focus"); 

  focus.append("text") // http://stackoverflow.com/questions/22064083/d3-js-multi-series-chart-with-y-value-tracking
        .attr("class", "tooltip2")
        .attr("x", width + 5) // position tooltips  
        .attr("y", function (d, i) { return (legendSpace)+i*(legendSpace); }); // (return (11.25/2 =) 5.625) + i * (5.625) // position tooltips       

  // Add mouseover events for hover line.
  d3.select("#mouse-tracker") // select chart plot background rect #mouse-tracker
  .on("mousemove", mousemove) // on mousemove activate mousemove function defined below
  .on("mouseout", function() {
      hoverDate
          .text(null) // on mouseout remove text for hover date

      d3.select("#hover-line")
          .style("opacity", 1e-6); // On mouse out making line invisible
  });
  function mousemove() { 
      var mouse_x = d3.mouse(this)[0]; // Finding mouse x position on rect
      var graph_x = xScale.invert(mouse_x); // 

      //var mouse_y = d3.mouse(this)[1]; // Finding mouse y position on rect
      //var graph_y = yScale.invert(mouse_y);
      //console.log(graph_x);
      
      var format = d3.time.format('%b %Y'); // Format hover date text to show three letter month and full year
      
      hoverDate.text(format(graph_x)); // scale mouse position to xScale date and format it to show month and year
      
      d3.select("#hover-line") // select hover-line and changing attributes to mouse position
          .attr("x1", mouse_x) 
          .attr("x2", mouse_x)
          .style("opacity", 1); // Making line visible

      // Legend tooltips // http://www.d3noob.org/2014/07/my-favourite-tooltip-method-for-line.html

      var x0 = xScale.invert(d3.mouse(this)[0]), /* d3.mouse(this)[0] returns the x position on the screen of the mouse. xScale.invert function is reversing the process that we use to map the domain (date) to range (position on screen). So it takes the position on the screen and converts it into an equivalent date! */
      i = bisectDate(data, x0, 1), // use our bisectDate function that we declared earlier to find the index of our data array that is close to the mouse cursor
      /*It takes our data array and the date corresponding to the position of or mouse cursor and returns the index number of the data array which has a date that is higher than the cursor position.*/
      d0 = data[i - 1],
      d1 = data[i],
      /*d0 is the combination of date and rating that is in the data array at the index to the left of the cursor and d1 is the combination of date and close that is in the data array at the index to the right of the cursor. In other words we now have two variables that know the value and date above and below the date that corresponds to the position of the cursor.*/
      d = x0 - d0.date > d1.date - x0 ? d1 : d0;
      /*The final line in this segment declares a new array d that is represents the date and close combination that is closest to the cursor. It is using the magic JavaScript short hand for an if statement that is essentially saying if the distance between the mouse cursor and the date and close combination on the left is greater than the distance between the mouse cursor and the date and close combination on the right then d is an array of the date and close on the right of the cursor (d1). Otherwise d is an array of the date and close on the left of the cursor (d0).*/

      //d is now the data row for the date closest to the mouse position

      focus.select("text").text(function(columnName){
         //because you didn't explictly set any data on the <text>
         //elements, each one inherits the data from the focus <g>

         return (d[columnName]);
      });
  };//

  //for brusher of the slider bar at the bottom
  function brushed() {

    xScale.domain(brush.empty() ? xScale2.domain() : brush.extent()); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent 

    svg.select(".x.axis") // replot xAxis with transition when brush used
          .transition()
          .call(xAxis);

    maxY = findMaxY(categories); // Find max Y rating value categories data with "visible"; true
    yScale.domain([0,maxY]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true
    
    svg.select(".y.axis") // Redraw yAxis
      .transition()
      .call(yAxis);   

    issue.select("path") // Redraw lines based on brush xAxis scale and domain
      .transition()
      .attr("d", function(d){
          return d.visible ? line(d.values) : null; // If d.visible is true then draw line for this d selection
      });
    
  };      

}); // End Data callback function
  
  function findMaxY(data){  // Define function "findMaxY"
    var maxYValues = data.map(function(d) { 
      if (d.visible){
        return d3.max(d.values, function(value) { // Return max rating value
          return value.rating; })
      }
    });
    return d3.max(maxYValues);
  }
//Second chart
var canvasWidth = 600,
          canvasHeight = 500,
          otherMargins = canvasWidth * 0.1,
          leftMargin = canvasWidth * 0.25,
          maxBarWidth = canvasHeight - - otherMargins - leftMargin
          maxChartHeight = canvasHeight - (otherMargins * 2);

      //set up linear scale for data to fit on chart area 
      var xScale1 = d3.scale.linear()
                      .range([0, maxBarWidth]);

      //set up ordinal scale for x variables
      var yScale1 = d3.scale.ordinal();

      //add canvas to HTML
      var chart = d3.select("#chart1").append("svg")
                                  .attr("width",canvasWidth)
                                  .attr("height", canvasHeight);                       

      //set up x axis                            
      var xAxis1 = d3.svg.axis()
                  .scale(xScale1)
                  .orient("bottom")
                  .ticks(5);

      //set up y axis
      var yAxis1 = d3.svg.axis()
                  .scale(yScale1)
                  .orient("left")
                  .tickSize(0);

      //add in data
      //csv has 4 lines before the data to be graphed
      //First line - Title of the chart
      //Second line - Source of the data
      //Third line - Metadata notes
      //Fourth line - blank
      //Fifth line - x variable name, y variable name
      //Sixth line onwards - x variable value, y variable value
        d3.xhr("teams.csv").get(function (error, response) {
          
          //retrieve data
          var dirtyCSV = response.responseText;
          var cleanCSV = dirtyCSV.split('\n').slice(4).join('\n');
          var data = d3.csv.parse(cleanCSV)
          
          //retrieve title
          var dirtyTitle = dirtyCSV.split('\n').slice(0,1).join('\n');
          var title = dirtyTitle.slice(0,-1);

              //get variable names
              var keys = d3.keys(data[0]);
              var namesTitle = keys[0];
              var valuesTitle = keys[1];

              //accessing the properties of each object with the variable name through its key
              var values = function(d) {return +d[valuesTitle];};
              var names = function(d) {return d[namesTitle];}

              // find highest value
              var maxValue = d3.max(data, values); 
              
              //set y domain by mapping an array of the variables along x axis
              yScale1.domain(data.map(names));
              
              //set x domain with max value and use .nice() to ensure the y axis is labelled above the max y value
              xScale1.domain([0, maxValue]).nice(); 

        //set bar width with rangeBands ([x axis width], gap between bars, gap before and after bars) as a proportion of bar width  
        yScale1.rangeBands([0, maxChartHeight], 0.1, 0.25);
        
        //set up rectangle elements with attributes based on data
        var rects = chart.selectAll("rect")
                        .data(data)
                        .enter()
                        .append("rect");

        //set up attributes of svg rectangle elements based on attributes
        var rectAttributes = rects
                              .attr("x", leftMargin)
                              .attr("y", function (d) {return yScale1(d[namesTitle]) + otherMargins; })
                              .attr("width", function (d) {return xScale1(d[valuesTitle])})
                              .attr("height", yScale1.rangeBand())
                              .attr("fill", "blue")
                              .on("mouseover", function(d, i) {
                                
                                //change fill
                                d3.select(this)
                                      .attr("fill", "orange");
                                
                                //set up data to show on mouseover
                                var xPosition = (parseFloat(d3.select(this).attr("width")) + leftMargin + 6);
                                var yPosition = parseFloat(d3.select(this).attr("y")) + (parseFloat(d3.select(this).attr("height")) / 2);
                                chart.append("text")
                                      .attr("id", "tooltip")
                                      .attr("x", xPosition)
                                      .attr("y", yPosition)
                                      .attr("dy", "0.35em")
                                      .attr("text-anchor", "start")
                                      .attr("font-family", "sans-serif")
                                      .attr("font-size", "12px")
                                      .attr("font-weight", "bold")
                                      .attr("fill", "black")
                                      .text(d[valuesTitle]);
                              })
                              
                              //transition out
                              .on("mouseout", function(d) {
                                d3.select(this)
                                  .transition()
                                  .duration(250)
                                  .attr("fill", "blue");
                                d3.select("#tooltip").remove();
                              });

        //chart title
        chart.append("text")
              .attr("x", canvasWidth / 2)
              .attr("y", otherMargins / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "middle")
              .attr("font-family", "sans-serif")
              .attr("font-size", "20px")
              .attr("font-weight", "bold")
              .attr("fill", "black")
              .text(title);

        //append x axis
        chart.append("g")
              .attr("transform", "translate(" + leftMargin + ", " + (maxChartHeight + otherMargins) + ")")
              .attr("text-anchor", "middle")
              .attr("font-family", "sans-serif")
              .attr("font-size", "10px")
              .style("stroke", "black")
              .style("fill", "none")
              .style("stroke-width", 1)
              .style("shape-rendering", "crispEdges")
              .call(xAxis1)
                .selectAll("text")
                .attr("stroke", "none")
                .attr("fill", "black");

        //append y axis
        chart.append("g")
              .attr("transform", "translate(" + leftMargin + ", " + otherMargins + ")")
              .attr("text-anchor", "middle")
              .attr("font-family", "sans-serif")
              .attr("font-size", "10px")
              .style("stroke", "black")
              .style("fill", "none")
              .style("stroke-width", 1)
              .style("shape-rendering", "crispEdges")
              .call(yAxis1)
              .selectAll("text")
                //.attr("dx", "-1.15em")
                .attr("stroke", "none")
                .attr("fill", "black")
                //.call(yScale.rangeBand()); //calls wrap function below

          //x axis title        
          chart.append("text")
                .attr("x", (maxBarWidth / 2) + leftMargin)
                .attr("y", canvasHeight - (otherMargins / 3))
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", "black")
                .text(valuesTitle);

          //y axis title
          chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -((maxChartHeight / 2) + otherMargins))
                .attr("y", leftMargin / 4)
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", "black")
                .text(namesTitle);
        
        //chart border - not necessary used for reference for the edge of canvas
        var border = chart.append("rect")
                          .attr("x", 0)
                          .attr("y", 0)
                          .attr("height", canvasHeight)
                          .attr("width", canvasWidth)
                          .style("stroke", "black")
                          .style("fill", "none")
                          .style("stroke-width", 1);

        //log anything in the console for debugging
        //console.log(yAxis);

      });
      
      //line wrap function adapted from "Wrapping Long Labels" - mike bostock
      function wrap(text, width) {
        text.each(function() {
          var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, //em
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            } 
          }
        })
      }

      //while the data is being loaded it turns the strings into a number
      function type(d) {
        d[yName] = +d[yName];
        return d;

      }



