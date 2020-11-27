const http = require("http");

const server = http.createServer((req, res) => {
  const data = [];
  req.on("data", (chunk) => data.push(chunk));
  req.on("end", () => {
    console.log("Recieved manifest:");
    console.log(data.join("\n"));
    res.end();
  });
});

server.listen(3000, () => {
  console.log("fake apply reciever listening...");
});
