const express = require("express")
var csrf = require("tiny-csrf");
const app = express();
const flash = require("connect-flash");
const path = require("path");

app.set("views", path.join(__dirname, "views"));

const sanitizeHtml = require('sanitize-html');
const { Note, Chapter, User, Page, Enroll, PageStat } = require('./models');
const bodyParser = require('body-parser');

var cookieParser = require('cookie-parser');

const passport = require('passport');
const connectEnsureLogin = require('connect-ensure-login')
const session = require('express-session')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const saltRounds = 10;


app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser("ssh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,'public')));
app.use(flash());

app.use(session({
    secret: "my-super-secret-key-2156238736988",
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(function (request, response, next) {
    response.locals.messages = request.flash();
    console.log(response.locals.messages)
    next();
});

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (username, password, done) => {
    User.findOne({ where: { email: username } })
        .then(async (user) => {
            const result = await bcrypt.compare(password, user.password);
            if (result) {
                return done(null, user);

            } else {
                return done(null, false, { message: "Invalid password" });
            }
        })
        .catch((error) => {
            return done(null, false, { message: "User does not exist" });
        });
}));
passport.serializeUser((user, done) => {
    done(null, user.id)
})
passport.deserializeUser((id, done) => {
    User.findByPk(id)
        .then(user => {
            if (user) {
                done(null, user); 
            } else {
                done(null, false); 
            }
        })

});




app.get("/course", connectEnsureLogin.ensureLoggedIn(), (req, res) => {

    if (req.user.roll == "student") {
        res.redirect("/show")
    } else {
        if (req.accepts("html")) {
            res.render('course', {

                csrfToken: req.csrfToken()
            });
        }
        else {
            res.json({
                csrfToken: req.csrfToken()
            })
        }
    }
});


app.post("/course", async (req, res) => {
    var userr = req.user

    p = await userr.createNote({ heading: req.body.heading })
    res.redirect("/chapter")
});




app.post("/show", async (req, res) => {
    try {
        const chapter = await Chapter.create({ noteId: req.body.notesid, title: req.body.title })
        console.log(chapter)

        return res.redirect("/show")


    } catch (error) {
        response.send(error)
    }
});


app.get("/show", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packs = await Note.findAll()
    const chaps = await Chapter.findAll()
    const userss = await User.findAll()
    const enrolls = await Enroll.findAll()
    const ensds = await Enroll.findAll({ where: { studentId: req.user.id } })
    const a = req.user
    const b = a.id
    const packIds = packs.map(pack => pack.id);
    const ensdscourseID = ensds.map(ensd => ensd.courseId);
    const filterpacks = packIds.filter(element => !ensdscourseID.includes(element));
    const notesForFilterPacks = [];

    for (const packId of filterpacks) {
        const notes = await Note.findOne({ where: { id: packId } });
        notesForFilterPacks.push(notes);
    }
    console.log(notesForFilterPacks)

    if (req.user.roll == "admin") {
        res.render('display', {
            packs,
            chaps,
            userss,
            a,
            enrolls,
            csrfToken: req.csrfToken()

        })
    } else {
        res.render('display2', {
            packs,
            chaps,
            userss,
            a,
            enrolls,
            ensds,
            notesForFilterPacks,
            b,
            csrfToken: req.csrfToken()

        })
    }
});


app.get("/", async function (reqest, response) {
    if (reqest.user) {
        response.redirect("/show")
    } else {
        response.render('fronts', {
            csrfToken: reqest.csrfToken()
        });
    }
});


app.get("/signup", (req, res) => {
    if (req.accepts("html")) {
        res.render('signup', {
            csrfToken: req.csrfToken()

        });
    }
    else {
        res.json({

        })
    }
});


app.post("/signup", async (req, res) => {
    const hashedPwd = await bcrypt.hash(req.body.password, saltRounds)
    if (req.body.password.length < 6) {
        req.flash("error", "Please enter a valid password of minimum length of 6 characters");
        return res.redirect("/signup");
    }
    try {
        const users = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPwd,
            roll: req.body.userType
        });
        req.login(users, (err) => {
            if (err) {
                console.log(err)
            }

            res.redirect("/show")
        })
    } catch (err) {
        console.log(err)
        req.flash("error", "user already exist")
        res.redirect("/signup")
    }
});


app.get("/signin", async (req, res) => {
    if (req.accepts("html")) {
        res.render('signin', {

            csrfToken: req.csrfToken()
        });
    }
    else {
        res.json({
            csrfToken: req.csrfToken()
        })
    }
});


app.get("/login", async (req, res) => {
    res.redirect("/");
});


app.post(
    "/session",
    passport.authenticate("local", {
        failureRedirect: "/signin",
        failureFlash: true,
    }),
    function (request, response) {


        response.redirect("/show");
    }
);




app.get("/chapter", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const notees = await Note.findAll({ where: { userId: req.user.id } })
    const notee = notees[notees.length - 1]
    if (notee) {
        if (req.accepts("html")) {
            res.render('chapter', {
                notee,

                csrfToken: req.csrfToken()
            });
        }
        else {
            res.json({

                csrfToken: req.csrfToken()
            })
        }
    } else {
        req.flash("error", "first create a course")
        res.redirect("/show")
    }

})

app.post("/chapter", async (req, res) => {
    const notees = await Note.findAll({ where: { userId: req.user.id } })
    const notee = notees[notees.length - 1]
    notee.createChapter({ title: req.body.title, description: req.body.description })
    res.redirect("/page")
});

app.get("/page", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const notees = await Note.findAll({ where: { userId: req.user.id } })
    const notee = notees[notees.length - 1]
    if (notee) {
        const chapters = await Chapter.findAll({ where: { noteId: notee.id } })
        if (req.accepts("html")) {
            res.render('page', {
                notee,
                chapters,

                csrfToken: req.csrfToken()
            });
        }
        else {
            res.json({

                csrfToken: req.csrfToken()
            })
        }
    } else {
        req.flash("error", "first create a chapter")
        res.redirect("/show")
    }
});


app.post("/page", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const ao = await Page.create({ word: req.body.word, chapterId: req.body.chapterId, completed: false });
    const a = req.body.chapterId;
    console.log(a);

    res.redirect(`/read?a=${a}`);
});


app.get("/read", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.roll == "student") {

        res.redirect("/show")
    } else {
        const a = req.query.a;


        if (!a) {
            return res.status(400).send("You can not access this page");
        }

        const pages = await Page.findAll({ where: { chapterId: a } });

        if (req.accepts("html")) {
            res.render('read', {
                pages,
                csrfToken: req.csrfToken()

            });
        } else {
            res.json({
                pages,

            });
        }
    }
});


app.get("/mycourse", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packs = await Note.findAll({ where: { userId: req.user.id } })


    if (req.accepts("html")) {
        res.render('mycourse', {
            packs,
            csrfToken: req.csrfToken()
        });
    }
    else {
        res.json({

        })
    }
});


app.get('/enroll/:packId', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;
    pos = await Enroll.findOne({ where: { studentId: req.user.id, courseId: packId } })
    if (pos) {
        req.flash("error", "You are already enrolled find it in my course section")
        res.redirect("/show")
    } else {
        const packId = req.params.packId;
        s = await Enroll.create({ studentId: req.user.id, courseId: packId })

        const chapters = await Chapter.findAll({ where: { noteId: packId } });


        const pageIds = [];

        for (const chapter of chapters) {

            const pages = await Page.findAll({ where: { chapterId: chapter.id } });

            const chapterPageIds = pages.map(page => page.id);
            pageIds.push(...chapterPageIds);
        }
        for (const pageId of pageIds) {
            const pagestat = await PageStat.create({
                studentId: req.user.id,
                courseId: packId,
                chapterId: 0,
                pageId: pageId,
                status: false
            });
        }
        res.redirect(`/viewcourse?packId=${packId}`)
    }
});


app.get("/viewcourse", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.query.packId;
    a = req.user.id
    p = await Enroll.findOne({ where: { studentId: req.user.id } })
    if (p) {
        const Chapters = await Chapter.findAll({ where: { noteId: packId } })
        res.render("access", {
            Chapters,
            packId,
            a,
            csrfToken: req.csrfToken()
        })
    } else {
        res.send("no")
    }
});


app.get("/acpage/:chapterId/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {

    const chapterId = req.params.chapterId;
    const packId = req.params.packId;
    const pages = await Page.findAll({ where: { chapterId: chapterId } })
    const pagestats = await PageStat.findAll({ where: { studentId: req.user.id, courseId: packId } })

    if (req.accepts("html")) {
        res.render('readforst', {
            packId,
            pages,
            pagestats,
            userid: req.user.id,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            pages,
            pagestats,
            csrfToken: req.csrfToken()
        });
    }
});


app.get("/reports", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {

    const packs = await Note.findAll({ where: { userId: req.user.id } });

    const enrolls = await Enroll.findAll()


    if (req.accepts("html")) {
        res.render('reports', {
            packs,
            enrolls,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            packs,
            enrolls
        });
    }
});


app.get("/progress/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;
    const enrolls = await Enroll.findAll({ where: { courseId: packId } })
    const chapters = await Chapter.findAll({ where: { noteId: packId } })
    const pagestats = await PageStat.findAll({ where: { courseId: packId } })
    const users = await User.findAll()
    const pages = await Page.findAll()
    if (req.accepts("html")) {
        res.render('progress', {
            chapters,
            pages,
            enrolls,
            users,
            pagestats,
            packId,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            chapters,
            pages,
            enrolls,
            users,
            pagestats,
            packId
        });
    }
});


app.put("/page/:id/:ip", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const pagestats = await PageStat.findOne({ where: { pageId: req.params.id, courseId: req.params.ip, studentId: req.user.id } })


    try {

        const updated = await pagestats.setCompletionStatus()
        return res.json(updated)



    } catch (error) {
        console.log(error);
        return res.status(422).json(error)
    }
});


app.get("/student/:studentId/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const studentId = req.params.studentId;
    const courseId = req.params.packId
    completed = await PageStat.count({ where: { studentId: studentId, courseId: courseId, status: true } })
    all = await PageStat.count({ where: { studentId: studentId, courseId: courseId } })

    c = completed / all
    p = c * 100
    if (req.accepts("html")) {
        res.render('studentprog', {
            completed,
            all,
            p,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            completed,
            all,
            p
        });
    }
});


app.get("/viewcourses/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;
    const chapters = await Chapter.findAll({ where: { noteId: packId } })

    if (req.accepts("html")) {
        res.render('see', {
            chapters,
            packId,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            chapters,
            packId
        });
    }
});


app.get("/mycoursestudent/:studentID", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const studentId = req.params.studentID
    const enrolls = await Enroll.findAll()
    const userss = await User.findAll()
    const packs = await Note.findAll()
    const ensds = await Enroll.findAll({ where: { studentId: studentId } })
    if (req.accepts("html")) {
        res.render('mycoursestudent', {
            studentId,
            enrolls,
            userss,
            packs,
            ensds,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            studentId,
            enrolls,
            userss,
            ensds
        });
    }
});


app.get("/myprogresses/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    a = req.user.id
    const packId = req.params.packId
    completed = await PageStat.count({ where: { studentId: a, courseId: packId, status: true } })
    all = await PageStat.count({ where: { studentId: a, courseId: packId } })
    c = completed / all
    p = c * 100


    if (req.accepts("html")) {
        res.render('myprog', {
            completed,
            all,
            p,
            a,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            completed,
            all,
            p
        });
    }
});


app.get("/change", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    res.render("changepass", {
        csrfToken: req.csrfToken()
    })
});



app.post("/changepassword", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const enteredCurrentPassword = req.body.currentPassword;
    const newpassword = req.body.newPassword;

    const user = await User.findByPk(req.user.id);

    const passwordMatch = await bcrypt.compare(enteredCurrentPassword, user.password);

    if (!passwordMatch) {
        req.flash("error", "Current password is incorrect.");
        res.redirect("/change")
    }
    else if (req.body.confirmPassword != req.body.newPassword) {
        req.flash("error", "Confirm password is not matching with new password.");
        res.redirect("/change")

    }
    else if (req.body.newPassword.length < 6) {
        req.flash("error", "password length should be more than 6");
        res.redirect("/change")
    }
    else {
        const saltRounds = 10; 
        const hashedNewPassword = await bcrypt.hash(newpassword, saltRounds);

        await user.update({ password: hashedNewPassword });

        res.redirect("/signin");
    }
});


app.get("/signout", (req, res, next) => {
    req.logOut((err) => {
        if (err) { return next(err) }
        else {

            res.redirect("/")
        }
    })
});


app.get("/viewcourseadmin/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.roll == "admin") {
        a = req.params.packId
        const chapters = await Chapter.findAll({ where: { noteId: a } })
        p = req.user.id
        res.render("viewcourseadmin", {
            a,
            p,
            chapters,
            csrfToken: req.csrfToken()
        })
    } else {
        res.redirect("/show")
    }
});


app.get("/adminpage/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.roll == "admin") {
        a = req.params.chapterId
        const chapter = await Chapter.findOne({ where: { id: a } })
        const packid = chapter.noteId


        const pages = await Page.findAll({ where: { chapterId: a } })
        p = req.user.id
        res.render("viewpageadmin", {
            a,
            p,
            packid,
            pages,
            csrfToken: req.csrfToken()
        })
    } else {
        res.redirect("/show")
    }
});


app.get("/viewcoursesadmin/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;
    const chapters = await Chapter.findAll({ where: { noteId: packId } })

    if (req.accepts("html")) {
        res.render('seeadmin', {
            chapters,
            packId,
            csrfToken: req.csrfToken()
        });
    } else {
        res.json({
            chapters,
            packId
        });
    }
});


app.get("/edit/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;

    const notee = await Note.findOne({ where: { id: packId } })

    if (notee) {
        if (req.accepts("html")) {
            res.render('chapteredit', {
                notee,

                csrfToken: req.csrfToken()
            });
        }
        else {
            res.json({

                csrfToken: req.csrfToken()
            })
        }
    } else {
        req.flash("error", "first create a course")
        res.redirect("/show")
    }
});


app.post("/chapteredit/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.params.packId;

    const notee = await Note.findOne({ where: { id: packId } })
    notee.createChapter({ title: req.body.title, description: req.body.description })
    res.redirect(`/pageedit?packId=${packId}`)

});


app.get("/pageedit", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packId = req.query.packId;
    const notee = await Note.findOne({ where: { id: packId } })
    const chapters = await Chapter.findAll({ where: { noteId: notee.id } })
    if (req.accepts("html")) {
        res.render('pageedit', {
            notee,
            chapters,
            packId,

            csrfToken: req.csrfToken()
        });
    }
    else {
        res.json({

            csrfToken: req.csrfToken()
        })
    }

});


app.post("/pageedit/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    console.log('hellow')
    const packId = req.params.packId;

    const ao = await Page.create({ word: req.body.word, chapterId: req.body.chapterId, completed: false });
    const a = req.body.chapterId;
    console.log(a);
    console.log('hellow1')
    const pages = await Page.findAll({ where: { chapterId: req.body.chapterId } })
    const page = pages[pages.length - 1]
    const enstudents = await PageStat.findAll({ where: { courseId: packId } })
    console.log(page.id)
    const ab = [];

    for (const enstudent of enstudents) {
        p = enstudent.studentId

        ab.push(p);
    }
    console.log(ab)
    let uniques = ab.filter((item, i, ar) => ar.indexOf(item) === i);
    console.log(uniques);
    console.log('hellow2')


    for (const unique of uniques) {
        console.log('hellow3')
        const pagestat = await PageStat.create({
            studentId: unique,
            courseId: packId,
            chapterId: 3,
            pageId: page.id,
            status: false
        });
    }
    res.redirect(`/read?a=${a}`);

});


app.get("/packs", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const packs = await Note.findAll()
    res.send(packs)
});


app.get("/viewcourseadminonline/:packId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.roll == "admin") {
        a = req.params.packId
        const chapters = await Chapter.findAll({ where: { noteId: a } })
        p = req.user.id
        res.render("viewcourseadminonline", {
            a,
            p,
            chapters,
            csrfToken: req.csrfToken()
        })
    } else {
        res.redirect("/show")
    }
});


app.get("/adminpageonline/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    if (req.user.roll == "admin") {
        a = req.params.chapterId
        const chapter = await Chapter.findOne({ where: { id: a } })
        const packid = chapter.noteId


        const pages = await Page.findAll({ where: { chapterId: a } })
        p = req.user.id
        res.render("viewpageadminonline", {
            a,
            p,
            packid,
            pages,
            csrfToken: req.csrfToken()
        })
    } else {
        res.redirect("/show")
    }
});


app.get("/posit", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    const educs = await User.findAll({ where: { roll: "admin" } })
    courses = await Note.findAll()
    const enrollments = [];

    const educss = [];

    for (const course of courses) {
        pw = course.heading

        pi = course.id
        pr = await Enroll.count({ where: { courseId: pi } })
        enrollments.push(pr);


        educss.push(pw);
    }
    res.render("posit", {
        educss,
        enrollments,
        courses,
        csrfToken: req.csrfToken()
    })
});


app.get("/about", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    res.render("about", {
        csrfToken: req.csrfToken()
    })
});


app.get("/contact", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    res.render("contact", {
        csrfToken: req.csrfToken()
    })
});



module.exports = app;


