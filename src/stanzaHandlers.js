const Client = require('node-xmpp-client');
import Utils from './utils';

const StanzaHandlers = {

  onNewPoll: function(bot, botJid, data) {

  let body = 'Nueva encuesta disponible de ' + data.creator + ': ' + data.pollTitle;

    for (let contact of data.contacts) {
      Utils.sendStanza(bot, botJid, contact, 'chat', body);
      console.log('Poll ' + data.pollTitle + ' sent to ' + contact);
    }
  },

  onNewVote: function(bot, botJid, data) {

    Utils.joinMucs(bot, data.mucs, null);

    let body = 'Nueva votación disponible de ' + data.creator + ':\n\n' + data.pollTitle + '\n';

    for (let muc of data.mucs) {
      Utils.sendVoteInformation(
        bot, botJid, muc, data.multiple, data.choices, body);
      console.log('Vote ' + data.pollTitle + ' shared in ' + muc);
    }

  }

};

module.exports = StanzaHandlers;
