const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const mysql = require('mysql');
const session = require('express-session');

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
    password: '00000000',
    database: 'user',
    debug: false
});

// 데이터베이스 및 테이블 생성
pool.getConnection((err, conn) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }

    const createDatabaseQuery = `
    CREATE DATABASE IF NOT EXISTS test;
    `;

    const useDatabaseQuery = `
    USE test;
    `;
    
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
        id varchar(100) NOT NULL COMMENT '사용자 로그인 아이디',
        name varchar(100) NOT NULL COMMENT '사용자의 이름',
        nickname varchar(100) DEFAULT NULL COMMENT '사용자의 닉네임',
        password varchar(300) NOT NULL COMMENT '로그인 암호, 패스워드',
        highschool varchar(300) DEFAULT NULL COMMENT '본인확인 고등학교',
        person varchar(300) DEFAULT NULL COMMENT '본인확인 인물',
        alias varchar(300) DEFAULT NULL COMMENT '본인확인 별명',
        travel varchar(300) DEFAULT NULL COMMENT '본인확인 여행',
        movie varchar(300) DEFAULT NULL COMMENT '본인확인 영화',
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    conn.query(createTableQuery, (err, result) => {
        conn.release();
        if (err) {
            console.error('테이블 생성 실패:', err);
        } else {
            console.log('테이블 생성 성공!');
        }
    });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'mainpublic')));
app.use(express.static(path.join(__dirname, 'basepublic')));
app.use(express.static(path.join(__dirname, 'dbpublic')));
app.use(express.static(path.join(__dirname, 'minion-bird-public/public')));

// adminpublic 폴더를 /admin 경로로 서빙
app.use('/admin', express.static(path.join(__dirname, 'adminpublic')));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

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
app.get('/minionbird.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'minion-bird-public/public/html', 'minionbird.html'));
});
app.get('/inquiry.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'inquiry/html', 'inquiry.html'));
});
app.get('/find.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dbpublic/html', 'find.html'));
});
app.get('/profile.html', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'dbpublic/html', 'profile.html'));
    } else {
        res.redirect('/login.html?redirectUrl=/profile.html'); // 로그인하지 않은 경우 로그인 페이지로 리디렉션
    }
});

// /admin 경로로 admin.html 파일 제공
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminpublic', 'admin.html'));
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
    console.log('/process/login 호출됨' + req);
    const paramId = req.body.id;
    const paramPassword = req.body.password;
    const redirectUrl = req.body.redirectUrl || '/';

    console.log('로그인 요청' + paramId + '' + paramPassword);
    
    if (!paramId || !paramPassword) {
        res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
        res.write('<h2>로그인 실패. 아이디와 비밀번호를 입력해 주세요.</h2>');
        res.end();
        return;
    }
    
    pool.getConnection((err, conn) => {
        if (err) {
            conn.release();
            console.log('Mysql getConnection error. aborted');
            res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
            res.write('<h1>DB서버 연결 실패</h1>');
            res.end();
            return;
        }
        const exec = conn.query('select `id`, `name`, `nickname` from `users` where `id`=? and `password`=?',
            [paramId, paramPassword],
            (err, rows) => {
                conn.release();
                console.log('실행된 SQL query: ' + exec.sql);

                if (err) {
                    console.dir(err);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
                    res.write('<h1>SQL query 실행 실패</h1>');
                    res.end();
                    return;
                }
                if (rows.length > 0) {
                    console.log('아이디[%s], 패스워드가 일치하는 사용자 [%s] 찾음', paramId, rows[0].name);
                    req.session.user = { id: rows[0].id, name: rows[0].name, nickname: rows[0].nickname }; // 세션에 사용자 정보 저장
                    res.redirect(redirectUrl);    // 로그인 성공시 리디렉션 URL로 이동
                    return;
                } else {
                    console.log('아이디[%s], 패스워드가 일치없음', paramId);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
                    res.write('<h2>로그인 실패. 아이디와 패스워드를 확인하세요.</h2>');
                    res.end();
                    return;
                }
            }
        );
    });
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
    console.log('/process/adduser 호출됨');
    const { nickname, name, id, password, highschool, person, alias, travel, movie } = req.body;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('Mysql getConnection error. aborted');
            res.status(500).json({ success: false, message: 'DB서버 연결 실패' });
            return;
        }
        const exec = conn.query(
            'INSERT INTO users (nickname, name, id, password, highschool, person, alias, travel, movie) VALUES (?,?,?,?,?,?,?,?,?);',
            [nickname, name, id, password, highschool, person, alias, travel, movie],
            (err, result) => {
                conn.release();
                console.log('실행된 SQL: ' + exec.sql);

                if (err) {
                    console.log('SQL 실행시 오류 발생');
                    console.dir(err);
                    res.status(500).json({ success: false, message: '다시 시도해주세요' });
                    return;
                }

                if (result) {
                    console.dir(result);
                    console.log('Inserted 성공');
                    res.status(200).json({ success: true, message: '회원가입 성공!', redirectUrl: '/' });
                } else {
                    console.log('Inserted 실패');
                    res.status(500).json({ success: false, message: '회원가입 실패ㅜㅜ' });
                }
            }
        );
    });
});

app.post('/process/findid', (req, res) => {
    const { name, securityQuestion, securityAnswer } = req.body;

    // 보안 질문에 해당하는 컬럼명을 미리 정의된 목록에서 검증
    const validSecurityQuestions = ['highschool', 'person', 'alias', 'travel', 'movie'];
    if (!validSecurityQuestions.includes(securityQuestion)) {
        res.status(400).json({ success: false, message: '유효하지 않은 보안 질문입니다.' });
        return;
    }

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('Mysql getConnection error:', err);
            res.status(500).send('서버 에러');
            return;
        }

        const query = `SELECT id FROM users WHERE name = ? AND ${securityQuestion} = ?`;
        conn.query(query, [name, securityAnswer], (err, rows) => {
            conn.release();

            if (err) {
                console.log('Mysql query error:', err);
                res.status(500).send('서버 에러');
                return;
            }

            if (rows.length > 0) {
                res.status(200).json({ success: true, id: rows[0].id });
            } else {
                res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
            }
        });
    });
});

// 비밀번호 찾기
app.post('/process/findpassword', (req, res) => {
    const { name, id } = req.body;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('Mysql getConnection error:', err);
            res.status(500).send('서버 에러');
            return;
        }

        const query = 'SELECT password FROM users WHERE name = ? AND id = ?';
        conn.query(query, [name, id], (err, rows) => {
            conn.release();

            if (err) {
                console.log('Mysql query error:', err);
                res.status(500).send('서버 에러');
                return;
            }

            if (rows.length > 0) {
                res.status(200).json({ success: true, password: rows[0].password });
            } else {
                res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
            }
        });
    });
});

app.get('/api/profile', (req, res) => { // 프로필 정보 API
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: '사용자가 로그인하지 않았습니다.' });
    }
});

app.post('/api/change-password', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인 상태가 아닙니다.' });
    }

    const { newPassword } = req.body;
    const userId = req.session.user.id;

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('MySQL 연결 실패:', err);
            return res.status(500).json({ error: '서버 에러' });
        }

        const query = 'UPDATE users SET password = ? WHERE id = ?';
        conn.query(query, [newPassword, userId], (err, result) => {
            conn.release();
            if (err) {
                console.error('비밀번호 변경 실패:', err);
                return res.status(500).json({ error: '비밀번호 변경 실패' });
            }
            res.json({ success: true });
        });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: '로그아웃 실패' });
        }
        res.redirect('/');
    });
});

server.listen(PORT, () => {
    console.log(`http://localhost:${PORT} 에서 실행 중..`);
});
