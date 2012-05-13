//definimos o namespace
var GDX = {
  //definimos as columnas do CSV
  columns : [
    {
      name: "Tempo",
      type: "time",
      format: "YYYY"
    },
    {
      name: "Gasto",
      type: "string",
      before: function(v){
        return v.replace(/^[0-9]*\s/g,'');
      }
    },
    {
      name: "Dato",
      type: "number",
      before: function(v){
        return (_.isUndefined(v) || _.isNull(v)) ?
          0 :
          parseInt(v);
      }
    }
  ],

  //Contenedor para as views da app
  Views : {},

  // router
  Router : Backbone.Router.extend({

    routes : {
      "" : "index"
    },

    index : function() {

    // configuración básica da aplicación
    GDX.config = {
      // Definimos o ano inicial dende o cal hai datos
      startDate : moment("1999", "YYYY"),

      // Definimos o ano final do cal hai datos
      finalDate : moment("2012", "YYYY"),

      // Definimos como imos a referirnos a todo o periodo
      wholeRange : "1999 / 2012",

      // Creamos o array de posibles sub-periodos co elemento incial que
      // representa a todos os periodos
      dateRanges : ["1999 / 2012"],

      // Array de cores para os bloques
      categoryColors : [
        "#CF3D1E", "#F15623", "#F68B1F", "#FFC60B", "#DFCE21",
        "#BCD631", "#95C93D", "#48B85C", "#00833D", "#00B48D",
        "#60C4B1", "#27C4F4", "#478DCB", "#3E67B1", "#4251A3", "#59449B",
        "#6E3F7C", "#6A246D", "#8A4873", "#EB0080", "#EF58A0", "#C05A89"
        ]

      };

      // Creamos un obxecto co esstado actual e o gasto total do estado actual
      GDX.state = {
        // Inicialmente definimos que vai mostrar todo o periodo
        currentRange : GDX.config.wholeRange,
        //Definimos o total inicial do periodo, este calcularase despois
        currentTotal : 0
      };

      // cargamos o Dataset dende o arquivo csv externo
      GDX.data = new Miso.Dataset({

        url: "data/data-gastos-xunta.csv",
        delimiter: ",",
        // indicamos que use a definición de columnas inicial
        columns: GDX.columns,
        sync: true,

        ready : function() {

          // === add a range column to the data ====
          var yearRangeValues = [];

          // iterate over each row and save the month and year
          this.each(function(row){
            yearRangeValues.push(row["Tempo"]);
          });

          yearRangeValues.sort(function(a,b) {
            return a.valueOf() - b.valueOf();
          });

          yearRangeValues = _.map(yearRangeValues, function(row) {
            return row.format("YYYY")
          });

          // add a period column to the data.
          this.addColumn({
            name: "Periodo",
            type: "String",
            data: yearRangeValues
          });

          this.remove(function(row){
            return (!(parseInt(row['Dato']) > 0));
          });

          // Calculate all possible month ranges in the required period, add an extra column
          // to the data containing appropriate grouping values
          GDX.config.dateRanges = _.union(
            GDX.config.dateRanges,
              _.unique(this.column("Periodo").data)
            );
          }
      });

      GDX.data.fetch({
        success : function() {
          GDX.app = new GDX.Views.Main();
          GDX.app.render();
        },

        error: function(){
          GDX.app.views.title.update("Datos non válidos: " + data.url);
        }
      });

    }
  })
};

/**
 * Main application view
 */
GDX.Views.Main = Backbone.View.extend({

  initialize : function() {
    this.views = {};
  },

  render : function() {
    this.views.title = new GDX.Views.Title();
    this.views.total = new GDX.Views.Total();
    this.views.dateranges = new GDX.Views.DateRanges();

    this.views.treemap = new GDX.Views.Treemap();

    this.views.title.render();
    this.views.total.render();
    this.views.dateranges.render();
    this.views.treemap.render();
  }
});

GDX.Views.Total = Backbone.View.extend({
  el: "#total",
  initialize: function(options){
    options = options || {};
    this.defaultMessage = "calculando total...";
    this.message = options.message || this.defaultMessage;
    this.setElement($(this.el));
  },
  render: function() {
    this.$el.html(this.message);

  },
  update: function(message) {
    if (typeof message !== "undefined") {
      msg = 'Total periodo ('+GDX.state.currentRange+'): '+message;
      this.message = msg;
    } else {
      this.message = this.defaultMessage;
    }
    this.render();
  }
});

GDX.Views.Title = Backbone.View.extend({

  el : "#legend",
  initialize : function(options) {
    options = options || {};
    this.defaultMessage = "Gastos da Xunta 1999/2012";
    this.message = options.message || this.defaultMessage;
    this.setElement($(this.el));
  },
  render : function() {
    this.$el.html(this.message);
  },
  update : function(message) {
    if (typeof message !== "undefined") {
      this.message = message;
    } else {
      this.message = this.defaultMessage;
    }
    this.render();
  }

});

/**
 * Date range dropdown containing all possiblev values.
 */
GDX.Views.DateRanges = Backbone.View.extend({

  el : '#range',
  template : 'script#dateRanges',

  events : {
    "change" : "onChange"
  },

  initialize : function(options) {
    options       = options || {};
    this.ranges   = options.ranges || GDX.config.dateRanges;
    this.template = _.template($(this.template).html());
    this.setElement($(this.el));
  },

  render : function() {
    this.$el.parent().show();
    this.$el.html(this.template({ dateRanges : this.ranges }));
    return this;
  },

  onChange : function(e) {
    GDX.state.currentRange = $("option:selected", e.target).val();
    GDX.app.views.treemap.render();
  }

});

/**
 * A tree map, uses d3.
 */
GDX.Views.Treemap = Backbone.View.extend({

  el : "#chart",

  initialize : function(options) {
    options = options || {};
    this.width = options.width || 970;
    this.height = options.height || 600;
    this.setElement($(this.el));
  },

  _hideGroup : function(elType, fadeTime, offset) {
    if (fadeTime) {
      offset = offset || 0;
      $(elType).each(function(index){
        $(this).delay(offset*index).fadeOut(fadeTime);
      });
    } else {
      $(elType).hide();
    }
  },

  _showGroup : function(elType, fadeTime, offset) {
    if (fadeTime) {
      offset = offset || 0;
      $(elType).each(function(index){
        $(this).delay(offset*index).fadeIn(fadeTime);
      });
    } else {
      $(elType).show();
    }
  },

  render : function() {

    // load state
    var range   = GDX.state.currentRange;

    // Create a data subset that we are rendering
    var groupedData = GDX.Utils.computeGroupedData();

    // === build data for d3
    var expenseData = {
      name: 'Total',
      elements: []
    };

    groupedData.each(function(row, index){
      expenseData.elements.push({
        name:  row['Gasto'],
        total: row["Dato"],
        color: GDX.config.categoryColors[index % GDX.config.categoryColors.length]
      });
    });

    // === build d3 chart
    // Build a treemap chart with the supplied data (using D3 to create, size, color and layout a series of DOM elements).
    // Add labels to each cell, applying dynamic styling choices according to the space available.
    // Bind custom handlers to cell highlighting and selection events.
    this.$el.empty();
    var selected = null;

    var layout = d3.layout.treemap()
      .sort(function(a,b){
        return a.value - b.value;
      })
    .children(function(d){
      return d.elements;
    })
    .size([this.width, this.height])
      .value(function(d){
        return d.total;
      });

    var chart = d3.select("#chart")
      .append("div")

      // set default styles for chart
      .call(function(){
        this.attr("class", "chart")
        .style("position", "relative")
        .style("width", this.width + "px")
        .style("height", this.height + "px");
      }
      );

    // set up data for the chart
    chart.data([expenseData])
      .selectAll("div")
      .data(function(d){
        return layout.nodes(d);
      })
    .enter()
      .append("div")

      // append a div for every piece of the treemap
      .call(function(){
        this.attr("class", "cell")
        .style("left",       function(d){ return d.x + "px"; })
        .style("top",        function(d){ return d.y + "px"; })
        .style("width",      function(d){ return d.dx - 1 + "px"; })
        .style("height",     function(d){ return d.dy - 1 + "px"; })
        .style("background", function(d){ return d.color || "#F7F7F7"; });
      })

    // on click just output some logging
    .on("click", function(d){
      if (selected) {
        selected.toggleClass("selection")
      };
      selected = $(this);
      selected.toggleClass("selection");
      //console.log(d, selected);
    })

    // on mouseover, fade all cells except the one being
    // selected.
    .on("mouseover", function(d){

      // update Title.
      GDX.app.views.title.update(
        GDX.Utils.toTitleCase(d.name) + " - " +
        GDX.Utils.toMoney(d.value.toFixed(0))
        );

      $(".cell").stop().fadeTo(300, 0.2);
      $(this).stop().fadeTo(0, 1.0);
    })

    // on mouse out, unfade all cells.
    .on("mouseout", function(d) {
      $(".cell").stop().fadeTo("fast", 1.0);
      GDX.app.views.title.update();
    })
    .append("p")
      // set the size for the labels for the dollar amount.
      // vary size based on size.
      .call(function(){
        this.attr("class", "label")
        .style("font-size", function(d) {
          return d.area > 55000 ?
          "14px" :
          d.area > 20000 ?
          "12px" :
          d.area > 13000 ?
          "10px" :
          "0px";
        })
      .style("text-transform", function(d) {
        return d.area > 20000 ?
        "none" :
        "uppercase";
      });
      })

    // append euro amounts
    .html(function(d){
      return "<span class='cost'>" +
      GDX.Utils.toMoney(d.value.toFixed(0)) +
      "</span>" +
      GDX.Utils.toTitleCase(d.name);
    });

    // update total
    GDX.app.views.total.update(
        GDX.Utils.toMoney(GDX.state.currentTotal.value)
    );

    // some graceful animation
    this._hideGroup("#chart .cell");
    this._showGroup("#chart .cell", 300, 10);
  }
});

// Random Utility functions
GDX.Utils = {
  removeMarks: function(str){
    return str.replace(/\"/g,'');
  },
  // Return the string supplied with its first character converted to upper case
  toTitleCase : function(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  },

  // Format currency values for display using the required prefix and separator
  toMoney : function(amount) {
    options = {
      symbol : "&euro;",
      decimal : ".",
      thousand: ",",
      precision : 0,
      format: '%v %s'
    };
    // we are using the accounting library
    return accounting.formatMoney(amount, options);
  },

  // Compute grouped data for a specific range, by the grouping.
  computeGroupedData : function() {
    // load state
    var range   = GDX.state.currentRange;

    // How are we selecting rows from the
    rangeSelector = (range == GDX.config.wholeRange) ?

      // Define a function for selecting all rows in the range between startDate and finalDate
      function(row){
        return (row["Tempo"].valueOf() >= GDX.config.startDate.valueOf())
          && (row["Tempo"].valueOf() <= GDX.config.finalDate.valueOf());
      } :
    // select the period from a specific row
    function(row){
      return (row["Periodo"] === range)
    };

    var groupedData = GDX.data.rows(rangeSelector).groupBy("Gasto",["Dato"]);

    groupedData.sort({
      comparator : function(a ,b){
        if (b["Dato"] > a["Dato"]) { return  1; }
        if (b["Dato"] < a["Dato"]) { return -1; }
        if (b["Dato"] === a["Dato"]) { return 0; }
      }
    });

    GDX.state.currentTotal = groupedData.sum('Dato');

    return groupedData;
  },
  computeTotal: function() {
    
  }
};

// Kick off application.
var mainRoute = new GDX.Router();
Backbone.history.start();
