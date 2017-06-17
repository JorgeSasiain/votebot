const Client = require('node-xmpp-client');

const Utils = {

  sendStanza: function(sender, to, type, body) {

    let stanza = new Client.Stanza(
      'message', {
        to: to,
        type: type
      }
    )
    .c('body')
    .t(body);

    sender.send(stanza);

  }

};

module.exports = Utils;
