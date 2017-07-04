const Client = require('node-xmpp-client');
import Utils from './utils';

const CommandHandlers = {

  /* PARAMS
    bot:    node-xmpp client
    botJid: JID of bot (response sender)
    data:   command message received drom user
    user:   JID of user (response receiver)
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

    if (type == 'groupchat') {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);
      return;
    }
    console.log(">List command: " + data);

  },

  onSelectCommand: function(bot, botJid, data, user, type) {

    if (type == 'groupchat') {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);
      return;
    }
    console.log(">Select command: " + data);

  },

  onDiscardCommand: function(bot, botJid, data, user, type) {

    if (type == 'groupchat') {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user, 'chat', body);
      return;
    }
    console.log(">Discard command: " + data);

  },

  onBackCommand: function(bot, botJid, data, user, type) {

    if (type == 'groupchat') {
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