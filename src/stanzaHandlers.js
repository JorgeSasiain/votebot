const Client = require('node-xmpp-client');

const StanzaHandlers = {

  onNewPoll: function(bot, data) {

    for (let contact of data.contacts) {

      let stanza = new Client.Stanza(
        'message', {
          to: contact,
          type: 'chat'
        }
      )
      .c('body')
      .t('Nueva encuesta disponible de ' + data.creator + ': ' + data.pollTitle);

      bot.send(stanza);
      console.log('Encuesta ' + data.pollTitle + ' enviada a ' + contact);
    }
  },

  onNewVote: function(bot, data) {

  }

};

module.exports = StanzaHandlers;
