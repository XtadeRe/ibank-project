const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

const STACKS_DIR = path.join(__dirname, "docker-stacks", "yml");
global.STACKS_DIR = STACKS_DIR;

global.activeOperations = new Map();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", require("./routes"));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Docker Agent запущен на порту ${PORT}`);
  console.log(`Папка стеков: ${STACKS_DIR}`);
});
