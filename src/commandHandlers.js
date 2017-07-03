const Client = require('node-xmpp-client');
import Mongo from './mongo';
import Utils from './utils';

const CommandHandlers = {

  /* COMMAND PARAMS
     bot:    node-xmpp client
     botJid: bare JID of bot (response sender)
     data:   command message received drom user
     user:   full JID of user or occupant JID of room user (response receiver)
     type:   type of message: chat or groupchat
  */

  onHelpCommand: function(bot, botJid, data, user, type) {

    let body = '\n*COMANDOS GENERALES*\n' +
               '/c, /comandos: mostrar comandos disponibles\n' +
               '/l, /listado: listar encuestas disponibles\n' +
               '/s <código>, /seleccionar <código>: seleccionar encuesta\n' +
               '\n*COMANDOS DE VOTACIÓN*\n' +
               '/v <opciones>, /votar <opciones>: votar en una pregunta\n' +
               '/d, /descartar: dejar de votar en encuesta\n' +
               '/a, /atras: cambiar voto en pregunta anterior\n'
               ;

    Utils.sendStanza(bot, botJid, user, 'chat', body);

  },

  onVoteCommand: function(bot, botJid, data, user, type) {

    console.log(">Vote command: " + data);

  },

  onListCommand: function(bot, botJid, data, user, type) {

    let body = '';
    user = user.substr(0, user.indexOf("/"));

    let callback = function(polls) {

      if (!polls) {
        body = '¡No hay ninguna encuesta disponible!';

      } else {
        for (let poll of polls) {
          body += '\n*' + poll.title + '*\n' +
                  'Creada por: ' + poll.creator + '\n' +
                  'Código: ' + poll.id_select + '\n'
                  ;
        }
        Utils.sendStanza(bot, botJid, user, 'chat', body);
      }
    };

    if (type == 'groupchat' || user.includes('@conference.')) {
      body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);

    } else {
      Mongo.getUserAvailablePolls(user, callback);
    }

  },

  onSelectCommand: function(bot, botJid, data, user, type) {

    let body = '';
    let poll_id = null;
    user = user.substr(0, user.indexOf("/"));

    let callback = function(poll) {

      if (!poll) {
        body = '¡El código de selección especificado no es correcto!';
      } else if (poll === "own") {
        body = '¡No puedes votar en una encuesta creada por tí!';
      } else if (poll === "empty") {
        body = 'La encuesta seleccionada no existe.';
      } else {
        body = 'Seleccionada encuesta "' + poll.title + '".';
        poll_id = poll._id;
      }
      Utils.sendStanza(bot, botJid, user, 'chat', body);

      if (poll_id) {

        let _callback = function() {

          let __callback = function(numQt, name, multiple, choices) {
            Utils.sendPollQuestion(bot, botJid, user, numQt, name, multiple, choices);
          }

          Mongo.getNextQuestion(user, __callback);
        }

        Mongo.initSessionData(user, poll_id, _callback);

      }

    }

    if (type == 'groupchat' || user.includes('@conference.')) {
      body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);

    } else {
      Mongo.findUserPollBySelectCode(user, data.slice(-5), callback);
    }

  },

  onDiscardCommand: function(bot, botJid, data, user, type) {

    if (type == 'groupchat' || user.includes('@conference.')) {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);
      return;
    }
    console.log(">Discard command: " + data);

  },

  onBackCommand: function(bot, botJid, data, user, type) {

    if (type == 'groupchat' || user.includes('@conference.')) {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);
      return;
    }
    console.log(">Back command: " + data);

  },

  onCommandError: function(bot, botJid, data, user, type) {

    let body = 'Comando erróneo o desconocido: /' + data;
    Utils.sendStanza(bot, botJid, user, 'chat', body);

  }

};

module.exports = CommandHandlers;