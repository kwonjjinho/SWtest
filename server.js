const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

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

// 데이터베이스 및 테이블 생성 및 수정
pool.getConnection((err, conn) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }

    const createDatabaseQuery = `
    CREATE DATABASE IF NOT EXISTS user;
    `;

    const useDatabaseQuery = `
    USE user;
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
        profileImage varchar(300) DEFAULT '/images/bob.webp' COMMENT '프로필 이미지',
        points INT DEFAULT 0 COMMENT '사용자 포인트',
        PRIMARY KEY (id),
        UNIQUE KEY unique_nickname (nickname)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;

    const checkProfileImageColumnQuery = `
    SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'profileImage';
    `;

    const alterProfileImageColumnQuery = `
    ALTER TABLE users ADD COLUMN profileImage VARCHAR(300) DEFAULT '/images/bob.webp' COMMENT '프로필 이미지';
    `;
    
    const checkPointsColumnQuery = `
    SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'points';
    `;

    const alterPointsColumnQuery = `
    ALTER TABLE users ADD COLUMN points INT DEFAULT 0 COMMENT '사용자 포인트';
    `;

    conn.query(createDatabaseQuery, (err) => {
        if (err) {
            console.error('데이터베이스 생성 실패:', err);
            return;
        }
        conn.query(useDatabaseQuery, (err) => {
            if (err) {
                console.error('데이터베이스 사용 실패:', err);
                return;
            }
            conn.query(createTableQuery, (err) => {
                if (err) {
                    console.error('테이블 생성 실패:', err);
                } else {
                    console.log('테이블 생성 성공!');
                }
                conn.query(checkProfileImageColumnQuery, (err, results) => {
                    if (err) {
                        console.error('프로필 이미지 컬럼 확인 실패:', err);
                        conn.release();
                    } else {
                        const count = results[0].count;
                        if (count === 0) {
                            conn.query(alterProfileImageColumnQuery, (err) => {
                                if (err) {
                                    console.error('프로필 이미지 컬럼 추가 실패:', err);
                                } else {
                                    console.log('프로필 이미지 컬럼 추가 성공!');
                                }
                            });
                        } else {
                            console.log('프로필 이미지 컬럼이 이미 존재합니다.');
                        }
                    }
                });
                conn.query(checkPointsColumnQuery, (err, results) => {
                    if (err) {
                        console.error('포인트 컬럼 확인 실패:', err);
                        conn.release();
                    } else {
                        const count = results[0].count;
                        if (count === 0) {
                            conn.query(alterPointsColumnQuery, (err) => {
                                conn.release();
                                if (err) {
                                    console.error('포인트 컬럼 추가 실패:', err);
                                } else {
                                    console.log('포인트 컬럼 추가 성공!');
                                }
                            });
                        } else {
                            conn.release();
                            console.log('포인트 컬럼이 이미 존재합니다.');
                        }
                    }
                });
            });
        });
    });
});

//문의 게시판 DB

app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 유저 이름
    password: '00000000', // MySQL 비밀번호
    database: 'post' // MySQL 데이터베이스 이름
});

db.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공!');

    const createDatabaseQuery = 'CREATE DATABASE IF NOT EXISTS post;';
    const useDatabaseQuery = 'USE post;';
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 ID',
            author VARCHAR(100) NOT NULL COMMENT '작성자',
            title VARCHAR(100) NOT NULL COMMENT '제목',
            content TEXT NOT NULL COMMENT '문의내용',
            date DATETIME NOT NULL COMMENT '날짜'
        ) COMMENT='게시글 테이블';
    `;

    db.query(createDatabaseQuery, (err, result) => {
        if (err) {
            console.error('데이터베이스 생성 실패:', err);
            return;
        }
        console.log('데이터베이스 생성 성공!');

        db.query(useDatabaseQuery, (err, result) => {
            if (err) {
                console.error('데이터베이스 사용 실패:', err);
                return;
            }
            console.log('데이터베이스 사용 성공!');

            db.query(createTableQuery, (err, result) => {
                if (err) {
                    console.error('테이블 생성 실패:', err);
                } else {
                    console.log('테이블 생성 성공!');
                }
            });
        });
    });
});

app.get('/api/posts', (req, res) => {
    const sql = 'SELECT * FROM posts';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error retrieving posts from database:', err);
            res.status(500).send('Database error');
        } else {
            res.status(200).json(results);
        }
    });
});

app.post('/api/posts', (req, res) => {
    const { title, author, content, date } = req.body;
    const sql = 'INSERT INTO posts (title, author, content, date) VALUES (?, ?, ?, ?)';
    db.query(sql, [title, author, content, date], (err, result) => {
        if (err) {
            console.error('Error adding post to database:', err);
            res.status(500).send('Database error');
        } else {
            console.log('1 record inserted');
            res.status(201).send('Post added');
        }
    });
});

app.put('/api/posts/:id', (req, res) => {
    const postId = req.params.id;
    const { title, author, content, date } = req.body;
    const sql = 'UPDATE posts SET title = ?, author = ?, content = ?, date = ? WHERE id = ?';
    db.query(sql, [title, author, content, date, postId], (err, result) => {
        if (err) {
            console.error('Error updating post in database:', err);
            res.status(500).send('Database error');
        } else if (result.affectedRows === 0) {
            res.status(404).send('Post not found');
        } else {
            res.status(200).send('Post updated successfully');
        }
    });
});

app.delete('/api/posts/:id', (req, res) => {
    const postId = req.params.id;
    const sql = 'DELETE FROM posts WHERE id = ?';
    db.query(sql, [postId], (err, result) => {
        if (err) {
            console.error('Error deleting post from database:', err);
            res.status(500).send('Database error');
        } else if (result.affectedRows === 0) {
            res.status(404).send('Post not found');
        } else {
            res.status(200).send('Post deleted successfully');
        }
    });
});

//커뮤니티 게시판

app.use(bodyParser.json());

const ddb = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 유저 이름
    password: '00000000', // MySQL 비밀번호
    database: 'post' // MySQL 데이터베이스 이름
});

ddb.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공!');

    const createDatabaseQuery = 'CREATE DATABASE IF NOT EXISTS post;';
    const useDatabaseQuery = 'USE post;';
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS img (
            id INT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 ID',
            author VARCHAR(100) NOT NULL COMMENT '작성자',
            title VARCHAR(100) NOT NULL COMMENT '제목',
            content TEXT NOT NULL COMMENT '문의내용',
            date DATETIME NOT NULL COMMENT '날짜'
        ) COMMENT='게시글 테이블';
    `;

    ddb.query(createDatabaseQuery, (err, result) => {
        if (err) {
            console.error('데이터베이스 생성 실패:', err);
            return;
        }
        console.log('데이터베이스 생성 성공!');

        ddb.query(useDatabaseQuery, (err, result) => {
            if (err) {
                console.error('데이터베이스 사용 실패:', err);
                return;
            }
            console.log('데이터베이스 사용 성공!');

            ddb.query(createTableQuery, (err, result) => {
                if (err) {
                    console.error('테이블 생성 실패:', err);
                } else {
                    console.log('테이블 생성 성공!');
                }
            });
        });
    });
});

app.get('/api/img', (req, res) => {
    const sql = 'SELECT * FROM img';
    ddb.query(sql, (err, results) => {
        if (err) {
            console.error('Error retrieving img from database:', err);
            res.status(500).send('Database error');
        } else {
            res.status(200).json(results);
        }
    });
});

app.post('/api/img', (req, res) => {
    const { title, author, content, date } = req.body;
    const sql = 'INSERT INTO img (title, author, content, date) VALUES (?, ?, ?, ?)';
    ddb.query(sql, [title, author, content, date], (err, result) => {
        if (err) {
            console.error('Error adding post to database:', err);
            res.status(500).send('Database error');
        } else {
            console.log('1 record inserted');
            res.status(201).send('Post added');
        }
    });
});

app.put('/api/img/:id', (req, res) => {
    const postId = req.params.id;
    const { title, author, content, date } = req.body;
    const sql = 'UPDATE img SET title = ?, author = ?, content = ?, date = ? WHERE id = ?';
    ddb.query(sql, [title, author, content, date, postId], (err, result) => {
        if (err) {
            console.error('Error updating post in database:', err);
            res.status(500).send('Database error');
        } else if (result.affectedRows === 0) {
            res.status(404).send('Post not found');
        } else {
            res.status(200).send('Post updated successfully');
        }
    });
});

app.delete('/api/img/:id', (req, res) => {
    const postId = req.params.id;
    const sql = 'DELETE FROM img WHERE id = ?';
    ddb.query(sql, [postId], (err, result) => {
        if (err) {
            console.error('Error deleting post from database:', err);
            res.status(500).send('Database error');
        } else if (result.affectedRows === 0) {
            res.status(404).send('Post not found');
        } else {
            res.status(200).send('Post deleted successfully');
        }
    });
});
//사진게시판
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const title = req.body.title.replace(/\s+/g, '-');
    const ext = path.extname(file.originalname);
    cb(null, `${title}${ext}`);
  }
});

const upload = multer({ storage: storage });

let images = [];

app.post('/upload', upload.single('image'), (req, res) => {
  const { title, category } = req.body;
  const image = {
    id: Date.now().toString(),
    image_url: `/uploads/${req.file.filename}`,
    category: category,
    title: title,
    rating: 0
  };
  images.push(image);
  res.send('Image uploaded successfully!');
});

app.get('/images', (req, res) => {
  res.json(images);
});

app.post('/rate', (req, res) => {
  const { imageId, rating } = req.body;
  const image = images.find(img => img.id === imageId);
  if (image) {
    image.rating = rating;
    res.send('Rating updated successfully!');
  } else {
    res.status(404).send('Image not found!');
  }
});



app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'mainpublic')));
app.use(express.static(path.join(__dirname, 'basepublic')));
app.use(express.static(path.join(__dirname, 'dbpublic')));
app.use(express.static(path.join(__dirname, 'minion-bird-public/public')));
app.use(express.static(path.join(__dirname, 'shootingpublic')));
app.use(express.static(path.join(__dirname, 'minion-jump-public')));
app.use(express.static(path.join(__dirname, '2048public')));
app.use(express.static(path.join(__dirname, 'runningpublic')));

// admin 라우터 불러오는 부분
const adminRouter = require('./routes/admin');
app.use('/admin', adminRouter); //admin 라우터 사용

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
app.get('/shooting', (req, res) => {
    res.sendFile(path.join(__dirname, 'shootingpublic/html', 'shooting.html'));
});
app.get('/minionbird.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'minion-bird-public/public/html', 'minionbird.html'));
});
app.get('/minionjump', (req, res) => {
    res.sendFile(path.join(__dirname, 'minion-jump-public', 'minionjump.html'));
});
app.get('/2048', (req, res) => {
    res.sendFile(path.join(__dirname, '2048public', '2048.html'));
});
app.get('/minionrun.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'runningpublic', 'minionrun.html'));
});
app.get('/inquiry.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'inquiry/html', 'inquiry.html'));
});
app.get('/community.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'community/html', 'community.html'));
});
app.get('/free.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'free/html', 'free.html'));
});
app.get('/pic.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pic', 'pic.html'));
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

// 로그인 상태 확인 API 추가 //게임페이지 들어가서 게임 할때 로그인했는지 확인
app.get('/api/check-login', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(200).json({ loggedIn: false });
    }
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
            console.log('Mysql getConnection error. aborted');
            res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
            res.write('<h1>DB서버 연결 실패</h1>');
            res.end();
            return;
        }
        const exec = conn.query('select `id`, `name`, `nickname`, `profileImage`, `points` from `users` where `id`=? and `password`=?',
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
                    req.session.user = { id: rows[0].id, name: rows[0].name, nickname: rows[0].nickname, profileImage: rows[0].profileImage, points: rows[0].points }; // 세션에 사용자 정보 저장
                    res.redirect(redirectUrl);    // 로그인 성공시 리디렉션 URL로 이동
                } else {
                    console.log('아이디[%s], 패스워드가 일치없음', paramId);
                    res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
                    res.write('<h2>로그인 실패. 아이디와 패스워드를 확인하세요.</h2>');
                    res.end();
                }
            }
        );
    });
});

app.post('/process/checknickname', (req, res) => {
    const nickname = req.body.nickname;

    pool.getConnection((err, conn) => {
        if (err) {
            console.log('Mysql getConnection error:', err);
            res.status(500).send('서버 에러');
            return;
        }

        conn.query('SELECT * FROM users WHERE nickname = ?', nickname, (err, rows) => {
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
    // 아이디 자릿수 제한 제거, 영어와 숫자만 체크
    if (!/^[A-Za-z0-9]+$/.test(id)) {
        return res.json({ success: false, message: '아이디는 영어와 숫자만 가능합니다.' });
    }

    // 비밀번호 자릿수 제한 유지
    if (!/^[A-Za-z0-9]{4,15}$/.test(password)) {
        return res.json({ success: false, message: '패스워드는 4~15자리의 영어와 숫자만 가능합니다.' });
    }
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
        const userId = req.session.user.id;
        pool.getConnection((err, conn) => {
            if (err) {
                return res.status(500).json({ error: '서버 에러' });
            }
            const query = 'SELECT id, name, nickname, profileImage, points FROM users WHERE id = ?';
            conn.query(query, [userId], (err, rows) => {
                conn.release();
                if (err) {
                    return res.status(500).json({ error: '쿼리 실행 실패' });
                }
                if (rows.length > 0) {
                    req.session.user = rows[0]; // 세션 업데이트
                    res.json(rows[0]);
                } else {
                    res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
                }
            });
        });
    } else {
        res.status(401).json({ error: '사용자가 로그인하지 않았습니다.' });
    }
});

// 비밀번호 변경
app.post('/api/change-password', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인 상태가 아닙니다.' });
    }

    const { newPassword } = req.body;
    const userId = req.session.user.id;

    // 비밀번호 형식 검증
    if (!/^[A-Za-z0-9]{4,15}$/.test(newPassword)) {
        return res.status(400).json({ error: '패스워드는 4~15자리의 영어와 숫자만 가능합니다.' });
    }

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


app.post('/api/change-profile-image', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인 상태가 아닙니다.' });
    }

    const { profileImage } = req.body;
    const userId = req.session.user.id;

    pool.getConnection((err, conn) => {
        if (err) {
            console.error('MySQL 연결 실패:', err);
            return res.status(500).json({ error: '서버 에러' });
        }

        const query = 'UPDATE users SET profileImage = ? WHERE id = ?';
        conn.query(query, [profileImage, userId], (err, result) => {
            conn.release();
            if (err) {
                console.error('프로필 이미지 변경 실패:', err);
                return res.status(500).json({ error: '프로필 이미지 변경 실패' });
            }
            req.session.user.profileImage = profileImage; // 세션에 저장된 프로필 이미지 업데이트
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
