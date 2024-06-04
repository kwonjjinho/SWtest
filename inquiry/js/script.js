const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 유저 이름
    password: '00000000', // MySQL 비밀번호
    database: 'post' // MySQL 데이터베이스 이름
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});
function addPostToDB(post) {
    const { title, author, content, date } = post;
    const sql = 'INSERT INTO posts (title, author, content, date) VALUES (?, ?, ?, ?)';
    db.query(sql, [title, author, content, date], (err, result) => {
        if (err) {
            console.error('Error adding post to database:', err);
        } else {
            console.log('1 record inserted');
        }
    });
}

