// creamos o namespace da aplicación

var APP ={
  // definimos as columnas de datosl é obrigatorio pero queda guai
  areaColumns: [
    {
      name: 'Concello',
      type: 'string'
    },
    {
      name: 'Superficie',
      type: 'number'
    },
    //esta columna non existe no CSV pero creámola igual porque imos echela con
    //contido do outro CSV
    {
      name: 'Population',
      type: 'number'
    }
  ],

  populationColumns: [
    {
      name: 'Concello',
      type: 'string'
    },
    {
      name: 'Total',
      type: 'number'
    }
  ],
  //
  //Definimos as vistas
  Views: {

  },

  // Definimos as urls
  Router: Backbone.Router.extend({
    routes: {
      "": "index"
    },
    index: function() {
      //Configuración específica para a app
      APP.config = {

      };

      //Obxecto para gardar o estado actual da app
      APP.status = {

      };

      //Gardamos todos os datos de superficie nun Dataset
      APP.areaData = new Miso.Dataset({
        url: 'data/superficie.csv',
        delimiter: ';',
        columns: APP.areaColumns
      });

      //Gardamos todos os datos de poboacion noutro dataset
      APP.populationData = new Miso.Dataset({
        url: 'data/poboacion.csv',
        delimiter: ';',
        columns: APP.populationColumns
      });

      //Isto controla que se recolleron os datos dos dous dataset
      _.when(APP.areaData.fetch(), APP.populationData.fetch()).then(function() {

        //Creamos un array vacío para gardar os datos de poboación
        var populationByCP = [];

        //Enchemos o array cos datos de poboación
        APP.populationData.each(function(row){
          populationByCP[row['CP']] = row['Total'];
        });

        //metemos os datos de poboación nesa columna usando o codigo postal
        //como índice
        APP.areaData.each(function(row){
          this.update(row['_id'], {
            Population: populationByCP[row['CP']]
          });
        });

        APP.boot = new APP.Views.Main();
        APP.boot.render();
      });

    }
  }),

  // Funcións para axudar
  Utils: {
    getData: function(){
      var filteredData = APP.areaData.rows();
      return filteredData;
    }
  }
};

APP.Views.Main = Backbone.View.extend({
  initialize: function(){
    this.views = {};
  },
  render: function(){
    this.views.title = new APP.Views.Title();
    this.views.chart = new APP.Views.Chart();

    this.views.title.render();
    this.views.chart.render();
  }
});

APP.Views.Title = Backbone.View.extend({
  el: '#titulo',
  initialize: function(options){
    options = options || {};
    this.defaultMessage = 'Poboación/superficie dos concellos da Coruña';
    this.message = options.message || this.defaultMessage;
  },
  render: function(){
    this.$el.html(this.message);
  },
  update: function(message){
    if(typeof(message) !== "undefined"){
      this.message = message;
    } else {
      this.message = this.defaultMessage;
    }

    this.render();
  }
});

APP.Views.Chart = Backbone.View.extend({
  el: '#chart',
  initialize: function(options) {
    options = options || {};
    this.width = options.width || 940;
    this.height = options.height || 600;
    this.color = d3.scale.category20b();
  },
  render: function() {
    this.$el.empty();
    //APP.Utils.getData().each(function(row){
      //console.log(this);
      //$('<p>').html(row['Concello']).appendTo(element);
    //});

    var color = this.color;

    var processedData = { 
      name: 'Data', 
      elements: [] 
    };

    APP.Utils.getData().each(function(row){
      processedData.elements.push({
        concello: row['Concello'],
        poboacion: row['Population'],
        superficie: row['Superficie']
      });
    });

    //console.log(processedData);

    var treemap = d3.layout.treemap()
      .size([this.width, this.height])
      .children(function(d) {
        return d.elements;
      })
      //.sticky(true)
      .value(function(d) { return d.poboacion; });

    var div = d3.select(this.el).append("div")
      .style("position", "relative")
      .style("width", this.width + "px")
      .style("height", this.height + "px");

    var cell = function(){
      this
        .style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; })
        .style("background", function(d){ return color(d.poboacion)});
    }

    div.data([ processedData ]).selectAll("div")
      .data(treemap.nodes)
      .enter().append("div")
      .attr("class", "cell")
      .call(cell)
      .append('p')
      .html(function(d) { return d.concello });

      d3.select("#area").on("click", function() {
        div.selectAll("div")
        .data(treemap.value(function(d) { return d.superficie; }))
        .transition()
        .duration(1500)
        .call(cell);

      d3.select("#area").classed("active", true);
      d3.select("#population").classed("active", false);
      });

      d3.select("#population").on("click", function() {
        div.selectAll("div")
        .data(treemap.value(function(d) { return d.poboacion; }))
        .transition()
        .duration(1500)
        .call(cell);

      d3.select("#area").classed("active", false);
      d3.select("#population").classed("active", true);
      });
  }
});

//lanzamos a aplicación
var mainRoute = new APP.Router;
Backbone.history.start();
