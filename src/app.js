const express = require("express");
const bodyParser = require("body-parser");
const { getServices, getStatus, getNextRun } = require("./engine");
const {
  readConfiguration,
  writeConfiguration,
} = require("./configuration-reader");

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("hello jolly");
});

app.get("/api/status", (req, res) => {
  res.send({
    status: getStatus(),
    nextRun: getNextRun(),
  });
});

app.get("/api/services", (req, res) => {
  res.send(getServices());
});

app.post("/api/services", async (req, res) => {
  const { id, repository } = req.body;

  if (!id || !repository) {
    res.status(400).send({ message: "Missing id and/or repository." });
    return;
  }

  const newEntry = { id: id, repository: repository };

  const configuration = (await readConfiguration()) || [];
  configuration.push(newEntry);

  await writeConfiguration(configuration);

  res.status(201).send(newEntry);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("thepoker is listening on port " + port);
});
