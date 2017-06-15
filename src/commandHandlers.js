const Client = require('node-xmpp-client');

const CommandHandlers = {

  onVoteCommand: function(client, data) {
    console.log(">Vote command: " + data);
  },

  onListCommand: function(client, data) {
    console.log(">List command: " + data);
  },

  onSelectCommand: function(client, data) {
    console.log(">Select command: " + data);
  },

  onDiscardCommand: function(client, data) {
    console.log(">Discard command: " + data);
  },

  onCommandError: function(client, data, user) {

    let stanza = new Client.Stanza(
      'message', {
        to: user,
        type: 'chat'
      }
    )
    .c('body')
    .t('Comando erróneo o desconocido: ' + data);

    client.send(stanza);

  }

};

module.exports = CommandHandlers;