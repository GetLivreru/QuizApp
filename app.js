require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const axios = require('axios');
const { UserModel, LogsModel, ItemModel, QuizQuestionModel, avatarQuestions, barbieQuestions, haticoQuestions, oneplusoneQuestioins,
    ictQuestions,
    flQuestions,
    cppQuestions
} = require('./db');
const { getMovieNews, getActors } = require('./api');
const openaiController = require('./controllers/openaiController');
const OpenAI = require('openai');
const learningPlanController = require('./controllers/learningPlanController');


const app = express();  
const port = 3000;   


 
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,  
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({
    secret: 'Adilet-se2203',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: !true,
    maxAge: 3600000 }}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('trust proxy', true);

app.get('/my-learn', learningPlanController.getOrCreateLearningPlan);


app.get('/results/:score', (req, res) => {
    const score = req.params.score;
    res.render('pages/results', { score: score });
});


app.post('/submitQuiz', async (req, res) => {
    const userAnswers = req.body; // Получение ответов пользователя из запроса
    const quizType = req.body.quizType; // Тип квиза, который передается с формы
    const questions = await QuizQuestionModel.find({ topic: quizType }); // Получение вопросов из базы данных

    let score = 0;

    // Проверка ответов пользователя
    for (let i = 0; i < questions.length; i++) {
        if (userAnswers['q' + i] == questions[i].correctAnswer) {
            score++;
        }
    }

    // Перенаправление на разные страницы в зависимости от типа квиза
    if (quizType === 'FL') {
        console.log('Redirecting to LearnFL');
        res.redirect(`/LearnFL?results=${encodeURIComponent(score)}`);
    } else if (quizType === 'ICT') {
        console.log('Redirecting to LearnICT');
        res.redirect(`/LearnICT?results=${encodeURIComponent(score)}`);
    } else if (quizType === 'CPP') {
        console.log('Redirecting to LearnCpp');
        res.redirect(`/LearnCpp?results=${encodeURIComponent(score)}`);
    } else {
        console.log('Redirecting to my-learn');
        res.redirect(`/my-learn?results=${encodeURIComponent(score)}`);
    }

});


app.get('/quizCpp', async (req, res) => {
    const cppQuestions = await QuizQuestionModel.find({ topic: 'Introduction to C++' });
    res.render('pages/quiz', { questions: cppQuestions });
});

app.get('/quizFL', async (req, res) => {
    const flQuestions = await QuizQuestionModel.find({ topic: 'Foreign Language' });
    res.render('pages/quizFL', { questions: flQuestions });
});

app.get('/quizICT', async (req, res) => {
    const ictQuestions = await QuizQuestionModel.find({ topic: 'ICT' });
    res.render('pages/quizICT', { questions: ictQuestions });
});



app.get('/learnFL', (req, res) => {
    const score = req.query.results;
    res.render('pages/LearnFL', { score: score });
});

app.get('/learnCPP', (req, res) => {
    const score = req.query.results;
    res.render('pages/LearnCPP', { score: score });
});

app.get('/learnICT', (req, res) => {
    const score = req.query.results;
    res.render('pages/LearnICT', { score: score });
});




app.get("/login", alreadyLoggedIn, async (req, res) => {
    const user = await getUserInstance(req);
    if (user) {
        return res.status(303).redirect("/");
    }

    res.render('pages/login.ejs', { activePage: "login", error: null, user: null });
});

app.post("/login", alreadyLoggedIn, async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        res.render('pages/login.ejs', { activePage: "login", error: "All fields are required", user: null });
        return;
    }

    let userInstance = await UserModel.findOne({ username: username }).exec();

    if (!userInstance) {
        res.render('pages/login.ejs', { activePage: "login", error: "User does not exist", user: null });
        return;
    } 

    const match = await bcrypt.compare(password, userInstance.password);
        
    if (!match) {
        LogsModel.create({ user: userInstance._id, request_type: "login", request_data: username, status_code: "401", timestamp: new Date(), response_data: "wrong password"});
        res.render('pages/login.ejs', { activePage: "login", error: "Password is incorrect", user: null });
        return;
    }

    req.session.userId = userInstance._id;
    console.log("User ID set in session:", req.session.userId);
    res.status(303).redirect("/");
    LogsModel.create({ user: userInstance._id,
        request_type: "login",
        request_data: username,
        status_code: "200",
        timestamp: new Date(),
        response_data: "success"});
});

 
app.get("/signup", alreadyLoggedIn, async (req, res) => {
    const user = await getUserInstance(req);
    if (user) {
        return res.status(303).redirect("/");
    }

    res.render('pages/signup.ejs', { activePage: "signup", error: null, user: null });
});

app.post("/signup", alreadyLoggedIn, async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        res.render('pages/signup.ejs', { activePage: "signup", error: "All fields are required", user: null });
        return;
    }

    let userInstance = await UserModel.findOne({ username: username }).exec();

    if (userInstance) {
        res.render('pages/signup.ejs', { activePage: "signup", error: "User already exists", user: null });
        return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    userInstance = new UserModel({ username: username, email: email, password: hashedPassword, created_at: new Date(), updated_at: new Date(), is_admin: false});
    await userInstance.save();

    res.status(303).redirect("/login");
    LogsModel.create({ user: userInstance._id, request_type: "signup", request_data: username, status_code: "200", timestamp: new Date(), response_data: "success"});
});

 
app.get("/logout", ensureAuthenticated, async (req, res) => {
    req.session.destroy();
    res.status(303).redirect("/");
    LogsModel.create({ user: null, request_type: "logout", request_data: null, status_code: "200", timestamp: new Date(), response_data: "success"});
});

 
app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on ${port}`);
});


app.get('/', async (req, res) => {
    try {
        const user = await getUserInstance(req);
        const items = await ItemModel.find().exec();

        res.render('pages/index.ejs', { activePage: "home", user: user ? user : null, error: null, items: items }); // Передача случайных персонажей в шаблон
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});




app.get("/admin", ensureAdmin, async (req, res) => {
    const user = await getUserInstance(req);

    if (!user || !user.is_admin) {
        return res.status(303).redirect("/");
    }

    const allUsers = await UserModel.find().exec();

    res.render('pages/admin.ejs', { activePage: "admin", user: user, users: allUsers });
});

app.get("/admin/:userid/delete", ensureAdmin, async (req, res) => {
    const user = await getUserInstance(req);

    if (!user || !user.is_admin) {
        return res.status(403).redirect("/");
    }

    const userId = req.params.userid;

    await UserModel.findByIdAndDelete(userId).exec();
    res.status(202).redirect("/admin");
});
app.get("/admin/:userid/makeAdmin", ensureAdmin, async (req, res) => {
    const user = await getUserInstance(req);

    if (!user || !user.is_admin) {
        return res.status(403).redirect("/");
    }

    const userId = req.params.userid;

    await UserModel.findByIdAndUpdate(userId, { is_admin: true }).exec();
    res.status(202).redirect("/admin");
});

app.post("/admin/addUser", ensureAdmin, async (req, res) => {
    const { username, email, password, is_admin } = req.body;
    const user = await getUserInstance(req);

    if (!user || !user.is_admin) {
        return res.status(403).redirect("/");
    }

    const userInstance = new UserModel({ username: username, email: email, password: password, is_admin: is_admin === "on" });
    await userInstance.save();

    res.status(202).redirect("/admin");
});



app.post('/admin/updateUser', ensureAdmin, async (req, res) => {
    const { userId, username, email, password } = req.body;
    const updated_at = new Date();
    await UserModel.findByIdAndUpdate(userId, { username, email, password, updated_at }).exec();

    res.redirect('/admin');
});


app.get("/admin/items", ensureAdmin, async (req, res) => {
    const user = await getUserInstance(req);
    const items = await ItemModel.find().exec();

    res.render('pages/admin_items.ejs', { activePage: "admin", user: user, items: items });
});


app.get('/admin/item/:itemId', ensureAdmin, async (req, res) => {
    const item = await ItemModel.findOne({ _id: req.params.itemId }).exec();
    return item ? res.json(item) : res.status(404).send("Item not found");
});

app.post("/admin/addItem", ensureAdmin, async (req, res) => {
    const { names, descriptions, pictures, creationDate, genre, director, budget,quizLink } = req.body;

    const newItem = new ItemModel({
        names: {
            en: names.en,
            ru: names.ru,
            kz: names.kz
        },
        descriptions: {
            en: descriptions.en,
            ru: descriptions.ru,
            kz: descriptions.kz
        },
        pictures: pictures,
        creationDate: creationDate,
        genre: genre,
        director: director,
        budget: budget,
        quizLink: quizLink
    });

    await newItem.save();

    res.status(303).redirect('/admin/items');
});

app.post("/admin/updateItem", ensureAdmin, async (req, res) => {
    console.log(req.body);
    const { itemId, names, descriptions, pictures, creationDate, genre, director, budget } = req.body;
    const updated_at = new Date();

    await ItemModel.findByIdAndUpdate(itemId, {
        names: {
            en: names.en,
            ru: names.ru,
            kz: names.kz
        },
        descriptions: {
            en: descriptions.en,
            ru: descriptions.ru,
            kz: descriptions.kz
        },
        pictures: pictures,
        creationDate: creationDate,
        genre: genre,
        director: director,
        budget: budget,
        updated_at: updated_at
    }).exec();

    res.status(303).redirect('/admin/items');
});

app.get("/admin/item/:itemId/delete", ensureAdmin, async (req, res) => {
    await ItemModel.findByIdAndDelete(req.params.itemId).exec();
    res.status(303).redirect('/admin/items');
});


app.get("/news", async (req, res) => {
    const news = await getMovieNews();
    const user = await getUserInstance(req);

    if (!news) {
        return res.render('pages/news.ejs', { activePage: "news", user: user, error: "Could not fetch news", data: null });
    }

    res.render('pages/news.ejs', { activePage: "news", user: user, data: news, error: null });
    LogsModel.create({ user: user ? user._id : null, request_type: "news", request_data: null, status_code: "200", timestamp: new Date(), response_data: JSON.stringify(news)});
});

async function ensureAdmin(req, res, next) {
    let user = null;

    if (req.session.userId) {
        user = await UserModel.findById(req.session.userId).exec();
    }

    if (user?.is_admin) {
        return next();
    }

    res.status(403).redirect("/");
}

async function alreadyLoggedIn(req, res, next) {
    if (req.session.userId) {
        return res.status(303).redirect("/");
    }

    return next();
}


async function getUserInstance(req) {
    if (req.session.userId) {
        return await UserModel.findById(req.session.userId).exec();
    }

    return null;
}


async function ensureAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }

    res.status(403).redirect("/login");
}