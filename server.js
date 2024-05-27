const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const mysql = require('mysql'); // npm install mysql
const static = require('serve-static');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

let targetNumber = generateRandomNumber();

function generateRandomNumber() {
    let digits = [];
    while (digits.length < 4) {
        let num = Math.floor(Math.random() * 10);
        if (!digits.includes(num)) {
            digits.push(num);
        }
    }
    return digits.join('');
}

const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'test',
    debug: false
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'mainpublic')));
app.use(express.static(path.join(__dirname, 'basepublic')));
app.use('/dbpublic', static(path.join(__dirname, 'dbpublic')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'mainpublic/html', 'index.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dbpublic/html', 'login.html'));
});
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dbpublic/html', 'adduser.html'));
});
app.get('/baseball.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'basepublic/html', 'baseball.html'));
});

app.post('/guess', (req, res) => {
    const { guess } = req.body;
    const result = getHint(guess, targetNumber);
    res.json({ ...result, targetNumber });
});

app.post('/newgame', (req, res) => {
    targetNumber = generateRandomNumber();
    res.sendStatus(200);
});

function getHint(guess, target) {
    let strikes = 0;
    let balls = 0;
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === target[i]) {
            strikes++;
        } else if (target.includes(guess[i])) {
            balls++;
        }
    }
    return { strikes, balls };
}

io.on('connection', (socket) => {
    console.log('새 사용자 접속!');

    socket.on('disconnect', () => {
        console.log('사용자 접속 종료!');
    });

    socket.on('chat message', (msg) => {
        console.log(`받은 메시지: ${msg}`);
        io.emit('chat message', msg);
    });
});

app.post('/process/login', (req, res) => {
    console.log('/process/login 호출됨' + req)
    const paramId = req.body.id;
    const paramPassword = req.body.password;

    console.log('로그인 요청' + paramId + '' + paramPassword);
    pool.getConnection((err, conn) => {

        if (err) {
            conn.release();
            console.log('Mysql getConnection error. aborted')
            res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
            res.write('<h1>DB서버 연결 실패</h1>')
            res.end();
            return;
        }
        const exec = conn.query('select `id`, `name` from `users` where `id`=? and `password`=?',
            [paramId, paramPassword],
            (err, rows) => {
                conn.release();
                console.log('실행된 SQL query: ' + exec.sql);

                if (err) {
                    console.dir(err);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h1>SQL query 실행 실패</h1>')
                    res.end();
                    return
                }
                if (rows.length > 0) {
                    console.log('아이디[%s], 패스워드가 일치하는 사용자 [%s] 찾음', paramId, rows[0].name);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h2>로그인 성공</h2>')
                    res.end();
                    return
                }
                else {
                    console.log('아이디[%s], 패스워드가 일치없음', paramId);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h2>로그인 실패. 아이디와 패스워드를 확인하세요.</h2>')
                    res.end();
                    return
                }
            }
        )

    })
});

app.post('/process/checkduplicate', (req, res) => {
    const userId = req.body.id;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('Mysql getConnection error:', err);
            res.status(500).send('서버 에러');
            return;
        }

        conn.query('SELECT * FROM users WHERE id = ?', userId, (err, rows) => {
            conn.release();

            if (err) {
                console.log('Mysql query error:', err);
                res.status(500).send('서버 에러');
                return;
            }

            if (rows.length > 0) {
                res.send('duplicate');
            } else {
                res.send('not_duplicate');
            }
        });
    });
});

app.post('/process/adduser', (req, res) => {
    console.log('/process/adduser 호출됨' + req)
    const paramNickName = req.body.nickname;
    const paramName = req.body.name;
    const paramId = req.body.id;
    const paramPassword = req.body.password;

    pool.getConnection((err, conn) => {

        if (err) {
            conn.release();
            console.log('Mysql getConnection error. aborted')
            res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
            res.write('<h1>DB서버 연결 실패</h1>')
            res.end();
            return;
        }
        console.log('데이터베이스 연결 끈 get ㅎㅎ');
        const exec = conn.query('insert into users (nickname, name, id, password) values(?,?,?,?);',
            [paramNickName, paramName, paramId, paramPassword],
            (err, result) => {
                conn.release();
                console.log('실행된 SQL: ' + exec.sql)

                if (err) {
                    console.log('SQL 실행시 오류 발생')
                    console.dir(err);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h1>SQL query 실행 실패</h1>')
                    res.end();
                    return
                }

                if (result) {
                    console.dir(result)
                    console.log('Inserted 성공')

                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h2>사용자 추가 성공</h2>')
                    res.end();
                }
                else {
                    console.log('Inserted 실패')

                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' })
                    res.write('<h1>사용자 추가 실패</h1>')
                    res.end();
                }
            }
        )
    })
});

server.listen(PORT, () => {
    console.log(`http://localhost:${PORT} 에서 실행 중..`);
    console.log('add server is running on http://localhost:3000/dbpublic/adduser.html')
    console.log('add server is running on http://localhost:3000/dbpublic/login.html')
});
