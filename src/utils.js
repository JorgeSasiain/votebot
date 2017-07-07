const Client = require('node-xmpp-client');

const Utils = {

  /* Send a XMPP stanza from 'from_' to each 'to'*/
  sendStanza: function(sender, from_, to, type, body) {

    let _sendStanza = function(sender, from_, to, type, body) {

      let stanza = new Client.Stanza(
        'message', {
          from: from_,
          to: to,
          type: type
        }
      )
      .c('body')
      .t(body);

      sender.send(stanza);

    }

    if (Array.isArray(to)) {
      for (let _to of to) {
        _sendStanza(sender, from_, _to, type, body);
      }
      return;
    }
    _sendStanza(sender, from_, to, type, body);

  },

  /* Send presence stanza to 'mucs' to attempt to join them */
  joinMucs: function(sender, mucs) {

    let i = 1;

    for (let muc of mucs) {

      let stanza = new Client.Stanza(
        'presence', {
          to: muc + '/votebot',
          id: 'room'+i
        }
      )
      .c('x', {xmlns: 'http://jabber.org/protocol/muc'});

      sender.send(stanza);
      i ++;

    }

  },

  /* Send next question of current poll */
  sendPollQuestion: function(bot, botJid, user, numQt, name, multiple, choices) {

    let body = '';

    /* Last question was answered */
    if (numQt === null) {
      body = 'Encuesta finalizada.';

    /* /v command was used without session data */
    } else if (numQt === "notNow") {
      body = 'Selecciona primero una encuesta para votar';

    /* Database error occurred */
    } else if (numQt === "err") {
      body = 'Ha ocurrido un error. Es posible que la encuesta haya sido borrada.';

    } else if (numQt === "exp") {
      body = 'La encuesta en la que estás votando ha caducado.';

    /* Ok: Send next question */
    } else {
      let btn = multiple ? '□' : '○' ;
      body = 'Pregunta ' + (numQt + 1) + ':\n' + name + '\n';
      choices.forEach(function(choice) {
        body += btn + ' ' + choice + '\n';
      });
    }

    Utils.sendStanza(bot, botJid, user, 'chat', body);

  },

  sendVoteInformation: function(bot, botJid, user, multiple, choices, body) {

    let btn = multiple ? '□' : '○' ;

    choices.forEach(function(choice) {
      body += btn + ' ' + choice + '\n';
    });

    Utils.sendStanza(bot, botJid, user, 'groupchat', body);

  },

  sendVoteResults: function(bot, botJid, users, type, voteInfo, body) {

    voteInfo = voteInfo.questions[0];
    let btn = voteInfo.multiple ? '□' : '○' ;
    body += voteInfo.question + '\n';

    for (let i = 0; i < voteInfo.choices.length; i ++) {
      body += btn + ' ' + voteInfo.choices[i] + ': ' + voteInfo.votes[i] + '\n';
    }

    if (Array.isArray(users)) {
      for (let user of users) {
        Utils.sendStanza(bot, botJid, users, type, body);
      }
    } else {
      Utils.sendStanza(bot, botJid, users, type, body);
    }

  }

};

module.exports = Utils;
