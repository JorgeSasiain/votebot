const Client = require('node-xmpp-client');

const CommandHandlers = {

  onVoteCommand: function(client, data, user) {
    console.log(">Vote command: " + data);
  },

  onListCommand: function(client, data, user) {
    console.log(">List command: " + data);
  },

  onSelectCommand: function(client, data, user) {
    console.log(">Select command: " + data);
  },

  onDiscardCommand: function(client, data, user) {
    console.log(">Discard command: " + data);
  },

  onChangeCommand: function(client, data, user) {
    console.log(">Change command: " + data);
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