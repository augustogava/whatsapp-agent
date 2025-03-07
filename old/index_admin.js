// const functions = require("firebase-functions");
// const express = require("express");
// const admin = require("firebase-admin")
//
// admin.initializeApp(functions.config().firebase)
// // once you have the admin initialized then can access other parts of project
// // say the real time database
// const realTimeDB = admin.database();
// const userRef = realTimeDB.ref("users").child("user_uid_or_such_here");
//
//
// const app = express();
//
// app.get("/", (req, res) => {
//     res.status(200).send({ data: "wordly hellos" });
// });
//
// exports.app = functions.https.onRequest(app);
//
// // Chron jobs
// //https://firebase.google.com/docs/functions/schedule-functions
//
// // example at 12:01 am every first of the month NYC time
// exports.chooseWhateverNameYouWant = functions.pubsub
//     .schedule("01 0 1 * *")
//     .timeZone("America/New_York")
//     .onRun((context) => {
//         // do the stuff
//     })
