const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const https = require('https');
const db = new sqlite3.Database('./beeper.db');

let clientBeeperMap = {}; 

function generateBeeperNumber() {
    const prefix = '015';
    const randomNumber = Math.floor(1000000 + Math.random() * 9000000); // 7자리 랜덤 숫자
    return prefix + randomNumber.toString();
}

app.use(express.static(__dirname+'/public/'));
app.get('/', (req, res) => {
  res.sendFile(__dirname+'/public/views/index.html');
});

app.get('/api/beeper', (req, res) => {
    const clientId = req.query.clientId;
    db.get("SELECT beeperNumber FROM beepers WHERE clientId = ?", [clientId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({ beeperNumber: row.beeperNumber });
        } else {
            const newBeeperNumber = generateBeeperNumber();
            db.run("INSERT INTO beepers (clientId, beeperNumber) VALUES (?, ?)", [clientId, newBeeperNumber], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ beeperNumber: newBeeperNumber });
            });
        }
    });
});

app.get('/api/allowedAreas', (req, res) => {
    db.all("SELECT lat, lon FROM allowedAreas", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ allowedAreas: rows });
    });
});

const options = {
    key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
};

const { createServer } = require('http');
const server = https.createServer(options, app); 
const IP = require('ip');
const PORT = 8443;

const { json } = require('body-parser');

server.listen(PORT, '0.0.0.0', () =>{
    console.log('[LOG] Server Started at https://'+IP.address()+':'+PORT);
  });

const { Server } = require('socket.io'); 
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('[LOG] New client connected:', socket.id);

    // setTimeout(function(){
    //     socket.emit('notification', 'message test');
    //     console.log('test')
    // }, 1000);

    socket.on('registerBeeper', (data) => {
        const { clientId, beeperNumber } = data;
        clientBeeperMap[beeperNumber] = socket.id;
        console.log(`Client ${clientId} with beeper number ${beeperNumber} registered as ${socket.id}`);
    });

    socket.on('callBeeper', (data) => {
        const { beeperNumber } = data;
        const targetSocketId = clientBeeperMap[beeperNumber];
        if (targetSocketId) {
            io.to(targetSocketId).emit('beeperCalled', { message: 'You have an incoming call!' });
            console.log(`Beeper number ${beeperNumber} called`);
        } else {
            console.log(`Beeper number ${beeperNumber} not found`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const [beeperNumber, socketId] of Object.entries(clientBeeperMap)) {
            if (socketId === socket.id) {
                delete clientBeeperMap[beeperNumber];
                break;
            }
        }
    });
});