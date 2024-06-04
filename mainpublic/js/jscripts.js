document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('signupForm').addEventListener('submit', function (event) {
        event.preventDefault();
        submitForm();
    });
});

function togglePassword(fieldId) {
    var passwordField = document.getElementById(fieldId);
    var passwordFieldType = passwordField.getAttribute('type');
    if (passwordFieldType === 'password') {
        passwordField.setAttribute('type', 'text');
    } else {
        passwordField.setAttribute('type', 'password');
    }
}

function checkDuplicate() {
    var userId = document.getElementById('userId').value;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/process/checkduplicate', true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            var response = xhr.responseText;
            var idCheckResult = document.getElementById('idCheckResult');
            idCheckResult.innerText = response === 'duplicate' ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.';
            idCheckResult.className = response;
        }
    };
    xhr.send('id=' + encodeURIComponent(userId));
}

function setAnswerInputName() {
    var questionSelect = document.getElementById('securityQuestion');
    var selectedQuestion = questionSelect.value;
    var answerInput = document.getElementById('securityAnswer');
    answerInput.name = selectedQuestion;
}

function submitForm() {
    var p1 = document.getElementById('password1').value;
    var p2 = document.getElementById('password2').value;
    if (p1 !== p2) {
        alert('비밀번호가 일치하지 않습니다.');
        return false;
    }
    var form = document.getElementById('signupForm');
    var formData = new FormData(form);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/process/adduser', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            var response = JSON.parse(xhr.responseText);
            alert(response.message);
            if (response.success) {
                // 회원가입 성공 시 폭죽 효과를 실행
                pop();
                setTimeout(() => {
                    render();
                }, 0); // 바로 애니메이션 실행
                // redirect
                setTimeout(() => {
                    window.location.href = response.redirectUrl;
                }, 3000); // 애니메이션 후에 리디렉션
            }
        }
    };
    var object = {};
    formData.forEach((value, key) => { object[key] = value });
    xhr.send(JSON.stringify(object));
    return true;
}

let particles = [];
const colors = ["#eb6383","#fa9191","#ffe9c5","#b4f2e1"];
function pop() {
    for (let i = 0; i < 150; i++) {
        const p = document.createElement('particule');
        p.x = window.innerWidth * 0.5;
        p.y = window.innerHeight + (Math.random() * window.innerHeight * 0.3);
        p.vel = {
            x: (Math.random() - 0.5) * 10,
            y: Math.random() * -20 - 15
        };
        p.mass = Math.random() * 0.2 + 0.8;
        particles.push(p);
        p.style.transform = `translate(${p.x}px, ${p.y}px)`;
        const size = Math.random() * 15 + 5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        document.body.appendChild(p);
    }
}

function render() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.style.transform = `translate3d(${p.x}px, ${p.y}px, 1px)`;
        
        p.x += p.vel.x;
        p.y += p.vel.y;
        
        p.vel.y += (0.5 * p.mass);
        if (p.y > (window.innerHeight * 2)) {
            p.remove();
            particles.splice(i, 1);
        }
    }
    requestAnimationFrame(render); // 계속해서 render 함수를 호출하도록 수정
}
