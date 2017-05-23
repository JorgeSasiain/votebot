const Client = require('node-xmpp-client');

const StanzaHandlers = {

  onNewPoll: function(client, data) {

    for (let contact of data.contacts) {

      let stanza = new Client.Stanza(
        'message', {
          to: contact,
          type: 'chat'
        }
      )
      .c('body')
      .t('Nueva encuesta disponible de ' + data.creator + ': ' + data.pollTitle);

      client.send(stanza);
      console.log('Encuesta ' + data.pollTitle + ' enviada a ' + contact);
    }
  },

  onNewVote: function(data) {

  }

};

module.exports = StanzaHandlers;
