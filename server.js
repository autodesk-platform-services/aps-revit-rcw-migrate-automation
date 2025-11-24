const express = require('express');
const cookieSession = require('cookie-session');
const { PORT, SERVER_SESSION_SECRET } = require('./config.js');

var app = express();
app.use(express.static('wwwroot'));
app.use(cookieSession({secret: SERVER_SESSION_SECRET, maxAge: 14 * 24 * 60 * 60 * 1000 }));
app.use(express.json({ limit: '50mb' }));

app.use( require('./routes/auth.js'));
app.use( require('./routes/hubs.js'));
app.use( require('./routes/revitAutomation.js'));
app.use( require('./routes/automationConfig.js'));
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode).json(err);
});


// add socket connection
var server = require('http').Server(app); 
// MyApp.SocketIo is a global object, will be used to send
// status to the client
global.MyApp = {
    SocketIo : require('socket.io')(server)
};
global.MyApp.SocketIo.on('connection', function(socket){
    console.log('user connected to the socket');

    socket.on('disconnect', function(){
        console.log('user disconnected from the socket');
      });
})

server.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));