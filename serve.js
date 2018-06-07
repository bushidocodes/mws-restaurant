const express = require("express");
const morgan = require("morgan");
const path = require("path");
const compression = require("compression");
const app = express();

// Setup Gzip compression of response bodies
app.use(compression());

// Setup logger
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'
  )
);

app.get("/restaurant.html", (req, res) =>
  res.sendFile(path.resolve(__dirname, "dist", "restaurant.html"))
);
// Serve static assets, and do not automatically direct to the index
app.use(express.static(path.resolve(__dirname, "dist")));

app.get("/healthcheck", (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});
