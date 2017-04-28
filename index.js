var Client = require('node-xmpp-client')

// Por ahora solo arranca un único bot
// Por ahora el bot envía un mensaje a un único usuario en vez de a todos sus contactos,
// y unicamente un mensaje de 'test' en vez de una encuesta

var client = new Client({
  jid: 'votebot@xmpp.jp',
  password: 'votebot',
  preferredSaslMechanism: 'DIGEST-MD5'
})

client.on('online', function(data) {

  console.log('Connected as ' + data.jid.local + '@' + data.jid.domain + '/' + data.jid.resource)
  client.send('<presence/>')

  var stanza = new Client.Stanza('message', {to: 'jorgesasiain@xmpp.jp', type: 'chat'})
    .c('body')
    .t('Hola, soy un bot!')

  client.send(stanza)

})

client.on('stanza', function(stanzaIn) {

	var messageIn = stanzaIn.getChildText('body')

  if (messageIn !== null) {

    console.log('Mensaje recibido: ' + messageIn)

    var stanzaOut = new Client.Stanza('message', {to: stanzaIn.attrs.from, type: 'chat'})
      .c('body')
      .t('He recibido tu mensaje, que dice: ' + messageIn)

    client.send(stanzaOut)
  }

})
