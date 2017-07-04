const Client = require('node-xmpp-client');

const Utils = {

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

  }

};

module.exports = Utils;
