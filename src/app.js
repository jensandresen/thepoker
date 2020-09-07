const express = require("express");
const app = express();
const { getServices, getStatus, getNextRun } = require("./engine");

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("hello jolly");
});

app.get("/api/services", (req, res) => {
  res.send(getServices());
});

app.get("/api/status", (req, res) => {
  res.send({
    status: getStatus(),
    nextRun: getNextRun(),
  });
});

app.listen(port, () => {
  console.log("thepoker is listening on port " + port);
});
