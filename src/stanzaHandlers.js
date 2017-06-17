const Client = require('node-xmpp-client');
import Utils from './utils';

const StanzaHandlers = {

  onNewPoll: function(bot, data) {

    for (let contact of data.contacts) {
      let body = 'Nueva encuesta disponible de ' + data.creator + ': ' + data.pollTitle;
      Utils.sendStanza(bot, contact, 'chat', body);
      console.log('Encuesta ' + data.pollTitle + ' enviada a ' + contact);
    }
  },

  onNewVote: function(bot, data) {

  }

};

module.exports = StanzaHandlers;
