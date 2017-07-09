const Client = require('node-xmpp-client');
import Mongo from './mongo';
import Utils from './utils';

const CommandHandlers = {

  /* COMMAND PARAMS
     bot:    node-xmpp client
     botJid: bare JID of bot (response sender)
     data:   command message received drom user
     user:   full JID of user or occupant JID of room user (cmd sender and response receiver)
     type:   type of message: chat or groupchat
  */

  onHelpCommand: function(bot, botJid, data, user, type) {

  let body = '';

  if (type == 'groupchat' || Utils.isMUC(user)) {

    body = 'Si existe una votación activa en esta habitación, puedes votar en ella ' +
           'utilizando el comando /v. Añade a dicho comando la opción u opciones en ' +
           'las que votar (ej. /v 2, /v 134). Si las opciones de la votación están ' +
           'precedidas por ○, significa que la votación es de selección unica, y si ' +
           'están precedidas por □, significa que puedes votar mas de una opción.\n\n' +
           'Para ver la información y resultados hasta el momento de la votación'  +
           'actualmente activa en la habitación, utiliza el comando /i.\n\n' +
           'Si no quieres que tu votación sea visible para el resto de usuarios ' +
           'conectados, puedes enviar el comando /v al bot de forma privada dentro de ' +
           'esta habitación.'
           ;

  } else {

    body = 'Para ver las encuestas disponibles, utiliza el comando /l. A continuación, ' +
           'puedes usar el comando /s para seleccionar una de ellas por su código de ' +
           'selección de 5 caracteres.\n\nUna vez seleccionada una encuesta, utiliza ' +
           'el comando /v para votar en cada una de sus preguntas. ' +
           'Añade a dicho comando la opción u opciones en las que votar ' +
           '(ej. /v 2, /v 134). Si las opciones de la pregunta están ' +
           'precedidas por ○, significa que es de selección unica, y si ' +
           'están precedidas por □, significa que puedes votar mas de una opción.\n\n' +
           'Tras votar en la pregunta actual, se enviará la siguiente pregunta de la ' +
           'encuesta. El proceso se repetirá hasta que no queden mas preguntas.' ;

  }

  body += '\n\nSi necesitas mas ayuda, utiliza el comando /c para ver los comandos disponibles.'
  Utils.sendStanza(bot, botJid, user, 'chat', body);

  },

  onCommandsCommand: function(bot, botJid, data, user, type) {

    let body = '\n*COMANDOS GENERALES*\n' +
               '/: ayuda e información general\n' +
               '/c, /comandos: mostrar comandos disponibles\n' +
               '/l, /listado: listar encuestas disponibles\n' +
               '/s <código>, /seleccionar <código>: seleccionar encuesta\n' +
               '\n*COMANDOS DE VOTACIÓN*\n' +
               '/v <opciones>, /votar <opciones>: votar en una pregunta o votación\n' +
               '/i, /info: mostrar información y resultados de votación en habitación\n' +
               '/d, /descartar: dejar de votar en encuesta\n' +
               '/a, /atras: rehacer voto en la pregunta anterior de encuesta\n'
               ;

    Utils.sendStanza(bot, botJid, user, 'chat', body);

  },

  onVoteCommand: function(bot, botJid, data, user, type) {

    let body = '';
    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

    let choices =
      [data.includes('1'), data.includes('2'), data.includes('3'), data.includes('4')];

    if (type == 'groupchat' || Utils.isMUC(user)) {

      let votingResults = {};
      votingResults.votes = [choices];

      let callback = function(poll_id) {
        if (!poll_id)
          Utils.sendStanza(bot, botJid, user_full, 'chat', 'No hay ninguna votación activa.');

        votingResults.poll_id = poll_id;
        Mongo.sumbitVotingResults(null, votingResults);
      }

      Mongo.getPollIDInMUC(user_bare, callback);

    } else {

      let callback = function(numQt, name, multiple, choices) {
        Utils.sendPollQuestion(bot, botJid, user_full, numQt, name, multiple, choices);
      };

      Mongo.applyVote(user_bare, choices, callback);

    }

  },

  onInfoCommand: function(bot, botJid, data, user, type) {

    let body = '';
    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

    if (type == 'groupchat' || Utils.isMUC(user)) {

      let callback = function(vote_id) {

        let _callback = function(voteInfo) {

          if (!voteInfo) {
            body = 'No hay ninguna votación activa.';
            Utils.sendStanza(bot, botJid, user_full, 'chat', body);

          } else {
            Utils.sendVoteResults(bot, botJid, user_full, 'chat', voteInfo, '');
          }

        }

        Mongo.getVoteInformationAndResults(vote_id, _callback);
      }

      Mongo.getPollIDInMUC(user_bare, callback);

    } else {

      body = 'Comando no disponible en chat individual.';
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);

    }

  },

  onListCommand: function(bot, botJid, data, user, type) {

    let body = '';
    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

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
      }

      Utils.sendStanza(bot, botJid, user_full, 'chat', body);
    };

    if (type == 'groupchat' || Utils.isMUC(user)) {
      body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);

    } else {
      Mongo.getUserAvailablePolls(user_bare, callback);
    }

  },

  onSelectCommand: function(bot, botJid, data, user, type) {

    let body = '';
    let poll_id = null;
    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

    let callback = function(poll) {

      if (!poll) {
        body = '¡El código de selección especificado no es correcto!';
      } else if (poll === "cant") {
        body = 'Finaliza primero la encuesta actual.'
      } else if (poll === "own") {
        body = '¡No puedes votar en una encuesta creada por tí!';
      } else if (poll === "empty") {
        body = 'La encuesta seleccionada no existe.';
      } else {
        body = 'Seleccionada encuesta "' + poll.title + '".';
        poll_id = poll._id;
      }
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);

      if (poll_id) {

        let _callback = function() {

          let __callback = function(numQt, name, multiple, choices) {
            Utils.sendPollQuestion(bot, botJid, user_full, numQt, name, multiple, choices);
          }

          Mongo.getNextQuestion(user_bare, __callback);
        }

        Mongo.initSessionData(user_bare, poll_id, _callback);

      }

    };

    if (type == 'groupchat' || Utils.isMUC(user)) {
      body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);

    } else {
      Mongo.findUserPollBySelectCode(user_bare, data.slice(-5), callback);
    }

  },

  onDiscardCommand: function(bot, botJid, data, user, type) {

    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

    if (type == 'groupchat' || Utils.isMUC(user)) {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);
      return;
    }

    let callback = function(modified) {
      let body = modified ? 'Encuesta descartada.' : 'No hay ninguna encuesta seleccionada.';
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);
    };

    Mongo.eraseSessionData(user_bare, callback);

  },

  onBackCommand: function(bot, botJid, data, user, type) {

    let user_full = user;
    let user_bare = user.substr(0, user.indexOf("/"));

    if (type == 'groupchat' || Utils.isMUC(user)) {
      let body = 'Comando no disponible en chat grupal: /' + data;
      Utils.sendStanza(bot, botJid, user_full, 'chat', body);
      return;
    }

    let body = '';

    let callback = function(numQt, name, multiple, choices) {
      if (numQt === 'notSel') {
        body = 'No hay ninguna encuesta seleccionada.';
        Utils.sendStanza(bot, botJid, user_full, 'chat', body);
      } else if (numQt === 'cant') {
        body = '¡Todavía no has empezado a votar!';
        Utils.sendStanza(bot, botJid, user_full, 'chat', body);
      } else {
        Utils.sendPollQuestion(bot, botJid, user_full, numQt, name, multiple, choices);
      }
    };

    Mongo.goBackToLastQuestion(user_bare, callback);

  },

  onCommandError: function(bot, botJid, data, user, type) {

    let body = 'Comando erróneo o desconocido: /' + data;
    Utils.sendStanza(bot, botJid, user, 'chat', body);

  }

};

module.exports = CommandHandlers;