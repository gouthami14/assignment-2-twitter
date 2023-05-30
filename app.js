const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dPath = path.join(__dirname, "twitterClone.db");
let db = null;

const init = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
  }
};

init();

app.post("/register/", async (request, response) => {
    const {username, password, gender, name} = request.body;
    const dbUser = await db.get(
        `SELECT * FROM user WHERE username = '${username}';`
    );
    if(dbUser === undefined){
        if(password.length >= 6){
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.run(
                `INSERT INTO user 
                (username, password, gender, name)
                VALUES
                ('${username}','${hashedPassword}','${gender}',${name});`
            );
            response.status(200);
            response.send("User created successfully");
        }else{
            response.status(400);
            response.send("Password is too short");
        }
    }else{
        response.status(400);
        response.send("User already exists");
    }
});

//get all users
app.post("/login/", async (request, response) => {
    const {username, password} = request.body;
    const dbUser = await db.get(
        `SELECT * FROM user WHERE username = '${username}';`
    );
    if(dbUser !== undefined){
        const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
        if(isPasswordMatch){
            let jwtToken = jwt.sign(username, "MY_SECRET_KEY");
            response.send({jwtToken});
        }else{
            response.status(400);
            response.send("Invalid password");
        }
    }else{
        response.status(400);
        response.send("Invalid user");
    }
});

function authenticateToken(request, response, next){
    let jwtToken;

    const authorization = request.headers["authorization"];
    if(authorization !== undefined){
        jwtToken = authorization.split(" ")[1];
    }

    if(jwtToken === undefined){
        response.status(401);
        response.send("Invalid JWT token");
    }else{
        jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) =>{
            const latestTweets = await db.all(`
            SELECT 
            tweet.tweet_id,
            tweet.user_id,
            user.username,
            tweet.tweet,
            tweet.date_time
            FROM
            follower
            LEFT JOIN tweet ON tweet.user_id = follower.following_user_id,
            LEFT JOIN user ON follower.following_user_id = user.user_id,
            WHERE follower.follower_user_id = (SELECT user_id FROM user WHERE username = "${request.username})
            ORDER BY tweet.date_time DESC
            LIMIT 4;
            `);
            response.send(latestTweets.map((item) => tweetResponse(item)));
        ));

//all the people who the logged user if following

app.get("/user/followers/", authenticateToken, async (request, response) => {
    const followers = await db.all(
        `SELECT
        user.name
        FROM
        follower
        LEFT JOIN user ON follower.following_user_id = user.user_id
        WHERE follower.following_user_id = (SELECT user_id FROM user WHERE username = '${request.username}');`
    );
    
})
    }
}