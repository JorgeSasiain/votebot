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

  /* Respond to subscription request by approving it, so that messages can be exchanged */
  approveSubscriptionRequest: function(sender, from_, to) {

    let stanza = new Client.Stanza(
      'presence', {
        from: from_,
        to: to,
        type: 'subscribed'
      }
    );

    sender.send(stanza);
    console.log("accepted user: " + from_);

  },

  /* Send presence stanza to muc or mucs to attempt to join them */
  joinMucs: function(sender, mucs, pass) {

    let i = 1;

    if (pass) {

      for (let muc of mucs) {

        let stanza = new Client.Stanza(
          'presence', {
            to: [mucs] + '/votebot',
            id: 'room'+i
          }
        )
        .c('x', {xmlns: 'http://jabber.org/protocol/muc'})
        .c('password').t(pass);

        sender.send(stanza);
        i ++;
      }

      return;
    }

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

  /* Check if JID corresponds to a chatroom service */
  isMUC: function (jid) {
    if (jid.includes('@conference.')) return true;
    if (jid.includes('@conferences.')) return true;
    if (jid.includes('@conf.')) return true;
    if (jid.includes('@rooms.')) return true;
    if (jid.includes('@muc.')) return true;
    if (jid.includes('@chat.')) return true;
    if (jid.includes('@salas.')) return true;
    return false;
  },

  /* Send next question of current poll */
  sendPollQuestion: function(bot, botJid, user, numQt, name, multiple, choices) {

    let body = '';

    /* Last question was answered */
    if (numQt === null) {
      body = 'Encuesta finalizada.';

    /* /v command was used without session data */
    } else if (numQt === "notNow") {
      body = '¡Selecciona primero una encuesta para votar!';

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
