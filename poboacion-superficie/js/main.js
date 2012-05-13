// creamos o namespace da aplicación

var APP ={
  // definimos as columnas de datos, non é obrigatorio pero queda guai
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
    this.defaultMessage = 'Cargando...';
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
    
  },
  render: function() {
    
  }
});

//lanzamos a aplicación
var mainRoute = new APP.Router;
Backbone.history.start();
