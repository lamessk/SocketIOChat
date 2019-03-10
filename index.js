var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

users = [];
connections = [];
messages = [];
var numUsers = 0;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    connections.push(socket);

    socket.username = getNumUsers();
    users.push(socket.username);
    socket.color = "000000";
    socket.emit('username', socket.username);
    updateUsernames();

    socket.emit('connecting', messages );
    console.log('Connected: %s sockets connected', connections.length);

    socket.emit('check cookies');
    socket.on('send cookies', function(data) {
        users.splice(users.indexOf(socket.username), 1);
        var cookie = data.split("=");
        socket.username = cookie[1];
        users.push(socket.username);
        socket.emit('username', socket.username);
        updateUsernames();
    });

    socket.on('disconnect', function(){
        users.splice(users.indexOf(socket.username), 1);
        connections.splice(connections.indexOf(socket), 1);
        updateUsernames();
        console.log('Disconnected: %s sockets connected', connections.length);
    });

    socket.on('send message', function(data){
        if(data.startsWith('/nickcolor')){
            newColor(socket, data);
        }
        else if(data.startsWith('/nick')){
            newUsername(socket, data);
            socket.emit('username', socket.username);
            updateUsernames();
        }
        else {
            messages.push({msg: data, user: socket.username, time: getFormattedTime(), color: socket.color});
            io.emit('new message', {msg: data, user: socket.username, time: getFormattedTime(), color: socket.color});
        }
    });

    function newUsername(socket, data){
        var newname = data.split(" ");
        if(newname[1].length < 1){
            socket.emit('bad name', data);
            return;
        }
        if(checkUnique(newname[1])){
            users[users.indexOf(socket.username)] = newname[1];
            socket.username = newname[1];
            socket.emit('new cookie', socket.username);
        }
    }

    function newColor(socket, data){
        var newcolor = data.split(" ");
        if(newcolor[1].length < 6 || newcolor[1].length > 6){
            socket.emit('bad color', newcolor[1]);
            return;
        }
        socket.color = newcolor[1];
    }

    function updateUsernames(){
        io.emit('get users', users);
    }

    function getFormattedTime(){
        var date = new Date();
        var mins;
        if(date.getMinutes().length == 1){
            mins = "0"+date.getMinutes();
        }
        else{
            mins = date.getMinutes();
        }
        return ( date.getHours() + ':' + mins );
    }

    function getNumUsers(){
        numUsers += 1;
        return 'User' + (numUsers);
    }

    function checkUnique(data){
        for(i=0; i < users.length; i++){
            if(users[i] === data){
                socket.emit('not unique', data);
                return false;
            }
        }
        return true;
    }
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});