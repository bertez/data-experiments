// creamos o namespace da aplicación
// e este é o último comentario que atoparedes neste código
// teño que poñer máis comentarios

var APP = {
  config : {
    requests: 0,
    maxRequests: 200,
    strings : {
      "depor": /depor/gi,
      "celta": /celta/gi
    }
  },

  status : {

  },

  Views: {},

  Router: Backbone.Router.extend({
    routes: {
      "": "index"
    },
    index: function() {

      boot = new APP.Views.Chart();

      APP.twitterData = new Miso.Dataset({
        url: function(){
          var searchString = _.keys(APP.config.strings).join('%20OR%20');

          var u = 'http://search.twitter.com/search.json?q=' + searchString + '&rpp=100&result_type=recent';

          if(!_.isUndefined(this.sinceID)) {
            u = u + '&since_id=' + this.sinceID;
          }
          u = u + '&callback='
          //console.log(u);
          return u;
        },
        interval : 2000,
        jsonp : true,
        resetOnFetch: true,
        extract : function(data) {
          _.each(data.results, function(tweet){
            _.each(APP.config.strings, function(regex, str) {
              if(regex.test(tweet.text)) {
                tweet[str] = tweet.text.match(regex).length;
              } else {
                tweet[str] = 0;
              }
            });
          });
          this.sinceID = data.results[data.results.length-1].id_str;
          return data.results;
        }
      });

      APP.twitterData.fetch({
        success : function() {
          //go for it
          APP.config.requests++;
          if(APP.config.requests >= APP.config.maxRequests){
            this.importer.stop();
            window.location.reload();
          }

          //this.remove(function(row) {
            //return row._id >= 2000;
          //});

          boot.render();
        }
      });
    }
  }),

  // Funcións para axudar
  Utils: {
    getData: function(){
      var filteredData = APP.twitterData;
      var processedData = {
        total: 0,
        data: []
      }

      _.each(APP.config.strings, function(regex,str) {
        var currentTotal = filteredData.sum(str);
        processedData.total = processedData.total + currentTotal
        processedData.data.push({
          name : str,
          total: currentTotal
        });
      });

      console.log(processedData);

      return processedData;
    }
  }
};


APP.Views.Chart = Backbone.View.extend({
  el: '#chart',
  initialize: function(options) {
    options = options || {};
    this.width = options.width || 960;
    this.height = options.height || 340;
    this.vis = d3.select(this.el)
      .append("svg:svg")
     .attr("width", this.width)
      .attr("height", this.height);
  },
  render: function() {
    var chartData = APP.Utils.getData();

    //console.log(chartData)

    var scale = d3.scale.linear().range ([0, 160]).domain([0, chartData.total]);
    var color = d3.scale.linear().range (['red', 'green']).domain([0, chartData.total]);

    var groups = this.vis.selectAll('g')
      .data(chartData.data, function(d) { return d.name });

    var groupEnter = groups.enter().append('g')
      .attr('transform', function (d, index) { return 'translate(' + (index*320 + 320) + ', 170)'; })

      groupEnter.append('circle')
        .attr('r', function(d) { return scale(d.total)})
        .style('fill', function(d){ return color(d.total)})

      groupEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .text(function(d) { return d.name })

    groups.select('circle').transition().duration(500)
      .attr('r', function(d) { return scale(d.total)})
      .style('fill', function(d){ return color(d.total)})
  }
});

//lanzamos a aplicación
var mainRoute = new APP.Router;
Backbone.history.start();
