const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index")
const app = require("../app")
let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/signin");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("todo test suite", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(2000, () => { });
    agent = request.agent(server);
  });
  
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  })

  test("signup", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/signup").send({
      firstName: "Testgsagjhsa",
      lastName: "User A",
      email: "usera@test.com",
      password: "123456789",
      roll:"admin",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/show");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/show");
    expect(res.statusCode).toBe(302);
  });

  test("create course", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const res = await agent.get("/course");
    
    
  const csrfToken = extractCsrfToken(res);
    const response = await agent.post('/course').send({
      "heading":"android dev",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("create chapter", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const res = await agent.get("/course");
    const csrfToken = extractCsrfToken(res);
    
    const response = await agent.post('/chapter').send({
      "title":"flutter",
      "description":"this is a language",
      _csrf: csrfToken,
    
    });
    expect(response.statusCode).toBe(302);
  });

  test("create page", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const res = await agent.get("/page");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post('/page').send({
      "word":"welcome",
      _csrf: csrfToken,
      chapterId:1
    });
    expect(response.statusCode).toBe(302);
  });

  test("GET /read", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const aValue = 1; 
    const response = await agent.get(`/read?a=${aValue}`);
    expect(response.statusCode).toBe(200);
    if (response.body.pages) {
      expect(Array.isArray(response.body.pages)).toBe(true); 
      expect(response.body.pages.length).toBeGreaterThan(0); 
    }
  });

  test("GET /mycourse", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const response = await agent.get("/mycourse");
    expect(response.statusCode).toBe(200);
    if (response.header["content-type"].includes("text/html")) {
    } else {
      expect(response.body).toBeDefined(); 
    }
  });

  test("Student Enrollment in a Course", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const packIdValue = 1;
    const response = await agent.get(`/enroll/${packIdValue}`);
    expect(response.statusCode).toBe(302);
    expect(response.header.location).toContain(`/viewcourse?packId=${packIdValue}`);
  });

  test("GET /viewcourse", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const packIdValue = 1; 
    const response = await agent.get(`/viewcourse?packId=${packIdValue}`);
    expect([200, 404]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      expect(response.text).toContain("Chapters"); 
    } else if (response.statusCode === 404) {
      expect(response.text).toContain("no"); 
    }
  });

  test("Mark as complete a page by a student", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const chapterIdValue = 1; 
    const packIdValue = 1; 
    const response = await agent.get(`/acpage/${chapterIdValue}/${packIdValue}`);
    expect(response.statusCode).toBe(200);
    if (response.header["content-type"].includes("text/html")) {
      expect(response.text).toContain("pages");
    } else {
      expect(response.body.pages).toBeDefined();
      expect(response.body.pagestats).toBeDefined();
    }
    res = await agent.get("/page");
    csrfToken = extractCsrfToken(res);
    const markCompleteResponse = await agent.put("/page/1/1").send({
      _csrf: csrfToken,
    });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.status).toBe(true);
  });

  test("Change Password", async () => {
    const agent = request.agent(server);
    await login(agent, "usera@test.com", "123456789");
    const getPasswordPageResponse = await agent.get("/change");
    expect(getPasswordPageResponse.statusCode).toBe(200);

    const newPassword = "newPassword123";
    const csrfToken = extractCsrfToken(getPasswordPageResponse);

    const changePasswordResponse = await agent
        .post("/changepassword")
        .send({
            currentPassword: "123456789",
            newPassword: newPassword,
            confirmPassword: newPassword,
            _csrf: csrfToken,
        });

    expect(changePasswordResponse.statusCode).toBe(302);

    // Make sure the password change is completed before attempting to log in
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await login(agent, "usera@test.com", newPassword);
    const loginResponse = await agent.get("/show");
    expect(loginResponse.statusCode).toBe(200);
    await agent.get("/signout");
  });
});
