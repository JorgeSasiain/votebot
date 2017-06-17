const Client = require('node-xmpp-client');
import Utils from './utils';

const CommandHandlers = {

  onHelpCommand: function(bot, data, user) {

    let body = '\n*COMANDOS GENERALES*\n' +
               '/c, /comandos: mostrar comandos disponibles\n' +
               '/l, /listado: listar encuestas disponibles\n' +
               '/s <código>, /seleccionar <código>: seleccionar encuesta\n' +
               '\n*COMANDOS DE VOTACIÓN*\n' +
               '/v <opciones>, /votar <opciones>: votar en una pregunta\n' +
               '/d, /descartar: dejar de votar en encuesta\n' +
               '/a, /atras: cambiar voto en pregunta anterior\n'
               ;

    Utils.sendStanza(bot, user, 'chat', body);

  },

  onVoteCommand: function(bot, data, user) {
    console.log(">Vote command: " + data);
  },

  onListCommand: function(bot, data, user) {
    console.log(">List command: " + data);
  },

  onSelectCommand: function(bot, data, user) {
    console.log(">Select command: " + data);
  },

  onDiscardCommand: function(bot, data, user) {
    console.log(">Discard command: " + data);
  },

  onBackCommand: function(bot, data, user) {
    console.log(">Back command: " + data);
  },

  onCommandError: function(bot, data, user) {
    let body = 'Comando erróneo o desconocido: ' + data;
    Utils.sendStanza(bot, user, 'chat', body);
  }

};

module.exports = CommandHandlers;