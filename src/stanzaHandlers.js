const Client = require('node-xmpp-client');
import Utils from './utils';

const StanzaHandlers = {

  onNewPoll: function(bot, botJid, data) {

    for (let contact of data.contacts) {
      let body = 'Nueva encuesta disponible de ' + data.creator + ': ' + data.pollTitle;
      Utils.sendStanza(bot, botJid, contact, 'chat', body);
      console.log('Poll ' + data.pollTitle + ' sent to ' + contact);
    }
  },

  onNewVote: function(bot, botJid, data) {

    Utils.joinMucs(bot, data.mucs);

    for (let muc of data.mucs) {
      let body = 'Nueva votación disponible de ' + data.creator + ': ' + data.pollTitle;
      Utils.sendStanza(bot, botJid, muc, 'groupchat', body);
      console.log('Vote ' + data.pollTitle + ' shared in ' + muc);
    }

  }

};

module.exports = StanzaHandlers;
